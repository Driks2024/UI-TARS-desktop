import { OrderData, OrderItem } from './pdf-parser';
import { PrismaClient, PolicyRule, PriceCatalog } from '@prisma/client';

const prisma = new PrismaClient();

export interface ValidationResult {
  status: 'APPROVED' | 'REJECTED' | 'EXCEPTION';
  reasons: string[];
  warnings: string[];
  exceptions: string[];
}

export const validateOrder = async (order: OrderData): Promise<ValidationResult> => {
  const result: ValidationResult = {
    status: 'APPROVED',
    reasons: [],
    warnings: [],
    exceptions: [],
  };

  const rules = await prisma.policyRule.findMany({ where: { isActive: true } });

  // Fetch all price catalog items for in-memory lookup (optimization for MVP)
  const priceCatalog = await prisma.priceCatalog.findMany();

  for (const rule of rules) {
    switch (rule.type) {
      case 'MIN_PRICE':
        await validateMinPrice(order, rule, priceCatalog, result);
        break;
      case 'DISCOUNT':
        await validateDiscount(order, rule, priceCatalog, result);
        break;
      case 'PAYMENT_TERMS':
        await validatePaymentTerms(order, rule, result);
        break;
      case 'SPECIAL_4801':
        await validateSpecial4801(order, rule, result);
        break;
    }
  }

  if (result.reasons.length > 0) {
    result.status = 'REJECTED';
  } else if (result.exceptions.length > 0) {
    result.status = 'EXCEPTION';
  }

  return result;
};

// --- Helper Functions ---

const getPriceInfo = (itemCode: string, catalog: PriceCatalog[]) => {
    // 1. Exact SKU match
    const exact = catalog.find(p => p.sku === itemCode);
    if (exact) return exact;

    // 2. Prefix match (longest prefix wins if multiple)
    const prefixes = catalog.filter(p => p.prefix && itemCode.startsWith(p.prefix));
    if (prefixes.length > 0) {
        // Sort by prefix length descending
        return prefixes.sort((a, b) => (b.prefix!.length - a.prefix!.length))[0];
    }

    return null;
};

const validateMinPrice = async (order: OrderData, rule: PolicyRule, catalog: PriceCatalog[], result: ValidationResult) => {
  // Using DB PriceCatalog instead of rule definition JSON for prices
  for (const item of order.items) {
    const priceInfo = getPriceInfo(item.code, catalog);

    if (priceInfo) {
        if (item.unitPrice < priceInfo.minPrice) {
            result.reasons.push(`Item ${item.code} (${item.description}): Unit Price R$ ${item.unitPrice.toFixed(2)} is below Minimum Price R$ ${priceInfo.minPrice.toFixed(2)}.`);
        }
    } else {
        // Optional: Warn if price not found in catalog?
        // result.warnings.push(`Item ${item.code}: No price rule found.`);
    }
  }
};

const validateDiscount = async (order: OrderData, rule: PolicyRule, catalog: PriceCatalog[], result: ValidationResult) => {
  const { max_percent } = JSON.parse(rule.definition);

  // Total order discount calculation
  let totalFullPrice = 0;
  let totalOrderPrice = 0;
  let hasFullPriceInfo = false;

  for (const item of order.items) {
      // Skip Special 4801 items from general discount calculation (per prompt requirement)
      if (item.code.startsWith('4801.')) continue;

      const priceInfo = getPriceInfo(item.code, catalog);
      if (priceInfo && priceInfo.fullPrice) {
          totalFullPrice += priceInfo.fullPrice * item.quantity;
          totalOrderPrice += item.unitPrice * item.quantity;
          hasFullPriceInfo = true;

          // Individual item discount check (Consistency Rule)
          if (item.unitPrice < priceInfo.fullPrice) {
             // If price is lowered, discount field should be 0 (per prompt)
             // We don't have explicit "discount field" parsed yet reliably, but we can check if price is lower.
          }
      }
  }

  if (hasFullPriceInfo && totalFullPrice > 0) {
      const discountPercent = ((totalFullPrice - totalOrderPrice) / totalFullPrice) * 100;

      if (discountPercent > max_percent) {
          result.reasons.push(`Total Order Discount: ${discountPercent.toFixed(2)}% exceeds limit of ${max_percent}%.`);
      }
  }
};

const validatePaymentTerms = async (order: OrderData, rule: PolicyRule, result: ValidationResult) => {
    const { tiers } = JSON.parse(rule.definition);
    // Tiers: [{ max: 1000, max_installments: 1, max_days: 30 }]

    const total = order.total;
    // Find the correct tier based on total
    const tier = tiers.find((t: any) => total <= t.max) || tiers[tiers.length - 1];

    if (!order.paymentTerms) {
        result.warnings.push('Payment terms not found in PDF.');
        return;
    }

    // Heuristic: count slashes + 1 = installments (e.g., "30/60/90")
    // Or numbers separated by spaces/commas
    const parts = order.paymentTerms.split(/[\/\s,\-]+/).filter(s => /^\d+$/.test(s));
    const installments = parts.length > 0 ? parts.length : 1;

    // Max days logic
    const days = parts.map(p => parseInt(p)).sort((a,b) => b-a)[0] || 0;

    if (installments > tier.max_installments) {
        result.reasons.push(`Payment Terms: ${installments} installments exceeds limit of ${tier.max_installments} for total R$ ${total.toFixed(2)}.`);
    }

    if (days > tier.max_days) {
        result.reasons.push(`Payment Terms: Max ${days} days exceeds limit of ${tier.max_days} days for total R$ ${total.toFixed(2)}.`);
    }
};

const validateSpecial4801 = async (order: OrderData, rule: PolicyRule, result: ValidationResult) => {
    const { prefix, max_discount, min_qty } = JSON.parse(rule.definition);

    for (const item of order.items) {
        if (item.code.startsWith(prefix)) {
            if (item.quantity < min_qty) {
                result.reasons.push(`Item ${item.code} (Special 4801): Quantity ${item.quantity} is below minimum ${min_qty}.`);
            }
            // Discount logic: Allow up to max_discount explicitly for these items
            // Need price catalog to know full price first?
            // Prompt says: "SEMPRE autorizar desconto declarado até 20%, mesmo sem preço cheio cadastrado"
            // If we don't have full price, we assume unit price is acceptable unless explicit discount field says > 20%
            if (item.discount && item.discount > max_discount) {
                result.reasons.push(`Item ${item.code} (Special 4801): Discount ${item.discount}% exceeds limit of ${max_discount}%.`);
            }
        }
    }
};
