import { ParsedCommand, ParsedItem, TransactionType, CurrencyCode } from '@/types';
import { normalizeArabicNumbers } from './currency';
import { getTodayDateString } from './dateUtils';
import { SYSTEM_CATEGORIES } from './defaultCategories';
import { generateUUID } from './utils';

// Keyword mappings for categories
interface CategoryRule {
  categoryId: string;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    categoryId: 'c1111111-1111-1111-1111-111111111101', // Food & Drinks
    keywords: [
      'lunch', 'dinner', 'breakfast', 'coffee', 'latte', 'cappuccino', 'tea',
      'cafe', 'restaurant', 'food', 'meal', 'snack', 'burger', 'pizza', 'shawarma', 'koshari',
      'غدا', 'عشا', 'فطار', 'قهوة', 'شاي', 'كافيه', 'مطعم', 'أكل', 'وجبة', 'شاورما', 'كشري', 'ساندوتش', 'عصير',
    ],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111102', // Groceries
    keywords: [
      'groceries', 'grocery', 'supermarket', 'market', 'vegetables', 'fruits', 'milk', 'bread', 'cheese', 'eggs',
      'بقالة', 'سوبرماركت', 'ماركت', 'خضار', 'فاكهة', 'لبن', 'عيش', 'خبز', 'جبنة', 'بيض', 'طلبات البيت',
    ],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111103', // Transportation
    keywords: [
      'transport', 'transportation', 'uber', 'careem', 'taxi', 'bus', 'metro', 'gas', 'petrol', 'fuel', 'parking', 'transit',
      'مواصلات', 'اوبر', 'أوبر', 'كريم', 'تاكسي', 'بنزين', 'مترو', 'اتوبيس', 'أتوبيس', 'تذكرة', 'باركينج', 'ركنة', 'كارته',
    ],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111104', // Housing & Rent
    keywords: ['rent', 'housing', 'apartment', 'home repair', 'إيجار', 'ايجار', 'سكن', 'شقة', 'صيانة العمارة'],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111105', // Utilities & Bills
    keywords: ['electricity', 'water bill', 'power', 'utility', 'bills', 'كهرباء', 'فاتورة المياه', 'فاتورة الغاز', 'فواتير'],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111106', // Internet & Telecom
    keywords: [
      'internet', 'wifi', 'phone', 'mobile', 'recharge', 'telecom', 'vodafone', 'orange', 'etisalat', 'we',
      'نت', 'إنترنت', 'انترنت', 'واي فاي', 'شحن', 'رصيد', 'باقة', 'فودافون', 'اورنج', 'أورنج', 'اتصالات', 'وي',
    ],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111107', // Healthcare
    keywords: [
      'doctor', 'pharmacy', 'medicine', 'hospital', 'clinic', 'dentist',
      'صيدلية', 'دكتور', 'طبيب', 'دواء', 'علاج', 'مستشفى', 'عيادة', 'أسنان',
    ],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111108', // Entertainment
    keywords: [
      'movie', 'cinema', 'game', 'gaming', 'playstation', 'netflix', 'spotify', 'outing',
      'سينما', 'فيلم', 'العاب', 'ألعاب', 'بلايستيشن', 'نتفليكس', 'خروجة', 'فسحة',
    ],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111109', // Shopping & Clothes
    keywords: [
      'shopping', 'clothes', 'clothing', 'shirt', 'pants', 'shoes', 'jacket', 'zara',
      'هدوم', 'ملابس', 'قميص', 'بنطلون', 'شوز', 'جزمة', 'تسوق', 'جاكيت',
    ],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111110', // Education
    keywords: ['course', 'book', 'tuition', 'school', 'university', 'كورس', 'دورة', 'كتاب', 'كتب', 'جامعة', 'مدرسة'],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111111', // Personal Care
    keywords: ['haircut', 'barber', 'salon', 'skincare', 'حلاقة', 'حلاق', 'صالون', 'عناية', 'كوافير'],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111112', // Salary
    keywords: ['salary', 'paycheck', 'payroll', 'مرتب', 'راتب', 'قبض'],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111113', // Freelance
    keywords: ['freelance', 'client', 'gig', 'project payment', 'فريلانس', 'مشروع', 'عميل', 'شغل حر'],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111114', // Allowance
    keywords: ['allowance', 'pocket money', 'مصروف', 'مصروفي'],
  },
  {
    categoryId: 'c1111111-1111-1111-1111-111111111115', // Gifts
    keywords: ['gift', 'bonus', 'عيدية', 'هدية', 'مكافأة'],
  },
];

/**
 * Finds the most suitable category based on keywords in the phrase
 */
export function matchCategory(text: string, defaultType: TransactionType = 'expense'): {
  categoryId: string;
  categoryName: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const lower = text.toLowerCase();
  
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      // Check word boundary or substring
      if (lower.includes(kw.toLowerCase())) {
        const cat = SYSTEM_CATEGORIES.find((c) => c.id === rule.categoryId);
        return {
          categoryId: rule.categoryId,
          categoryName: cat?.name || 'Expense',
          confidence: 'high',
        };
      }
    }
  }

  // Fallback defaults
  const fallbackId =
    defaultType === 'income'
      ? 'c1111111-1111-1111-1111-111111111118' // Other Income
      : 'c1111111-1111-1111-1111-111111111117'; // Other Expenses

  const cat = SYSTEM_CATEGORIES.find((c) => c.id === fallbackId);
  return {
    categoryId: fallbackId,
    categoryName: cat?.name || (defaultType === 'income' ? 'Other Income' : 'Other Expenses'),
    confidence: 'low',
  };
}

/**
 * Extracts currency from text if explicitly stated, otherwise defaults to user currency.
 */
function extractCurrency(text: string, defaultCurrency: CurrencyCode = 'EGP'): CurrencyCode {
  const lower = text.toLowerCase();
  if (lower.includes('usd') || lower.includes('dollar') || lower.includes('دولار') || lower.includes('$')) {
    return 'USD';
  }
  if (lower.includes('eur') || lower.includes('euro') || lower.includes('يورو') || lower.includes('€')) {
    return 'EUR';
  }
  if (lower.includes('sar') || lower.includes('ريال') || lower.includes('rial')) {
    return 'SAR';
  }
  if (lower.includes('aed') || lower.includes('درهم') || lower.includes('dirham')) {
    return 'AED';
  }
  if (lower.includes('gbp') || lower.includes('pound st') || lower.includes('إسترليني')) {
    return 'GBP';
  }
  return defaultCurrency;
}

/**
 * Parses conversational commands like queries or modifications
 */
export function parseConversationalCommand(
  rawInput: string,
  defaultCurrency: CurrencyCode = 'EGP'
): ParsedCommand | null {
  const normalized = normalizeArabicNumbers(rawInput.trim());
  const lower = normalized.toLowerCase();

  // 1. Query: Today's spending
  // "How much did I spend today?" / "كم صرفت اليوم؟" / "مصاريف اليوم"
  if (
    /how much (did i spend|spent) today/i.test(lower) ||
    /كم (صرفت|دفعت) اليوم/i.test(lower) ||
    /مصاريف اليوم/i.test(lower) ||
    /spent today/i.test(lower)
  ) {
    return {
      type: 'query_today',
      raw_text: rawInput,
      confidence: 0.95,
      query_params: { timeframe: 'today' },
    };
  }

  // 2. Query: Budget left
  // "How much budget do I have left?" / "كم الميزانية المتبقية؟" / "باقي كام في الميزانية"
  if (
    /how much budget (do i have left|remains|left)/i.test(lower) ||
    /budget left/i.test(lower) ||
    /كم (الميزانية|الميزانيه) المتبقية/i.test(lower) ||
    /باقي (كام|كم) (في|من) الميزانية/i.test(lower) ||
    /الميزانية المتبقية/i.test(lower)
  ) {
    return {
      type: 'query_budget',
      raw_text: rawInput,
      confidence: 0.95,
      query_params: { timeframe: 'month' },
    };
  }

  // 3. Query: Category expenses this week / month
  // "Show my food expenses this week" / "مصاريف الأكل هذا الأسبوع"
  const catQueryMatchEn = lower.match(/(?:show|what are|how much did i spend on) ([a-z\s]+) (?:expenses )?(this week|this month)/i);
  const catQueryMatchAr = lower.match(/مصاريف ([^\s]+) (هذا الأسبوع|هذا الشهر)/);
  if (catQueryMatchEn || catQueryMatchAr) {
    const rawTarget = catQueryMatchEn ? catQueryMatchEn[1] : catQueryMatchAr![1];
    const timeframeStr = (catQueryMatchEn ? catQueryMatchEn[2] : catQueryMatchAr![2]).toLowerCase();
    const isWeek = timeframeStr.includes('week') || timeframeStr.includes('الأسبوع');
    const matched = matchCategory(rawTarget);

    return {
      type: 'query_category',
      raw_text: rawInput,
      confidence: 0.9,
      query_params: {
        category_id: matched.categoryId,
        category_name: matched.categoryName,
        timeframe: isWeek ? 'week' : 'month',
      },
    };
  }

  // 4. Update transaction command
  // "Change the lunch expense from 85 to 70 EGP" / "عدل مصروف الغدا من 85 ل 70" / "غير مصروف الغدا من 85 الى 70"
  const updateMatchEn = normalized.match(
    /(?:change|update|edit) (?:the )?([a-zA-Z\s]+?)(?: expense| transaction)? from (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)/i
  );
  const updateMatchAr = normalized.match(
    /(?:عدل|غير) (?:مصروف|معاملة)?\s*([^\d]+?)\s*من\s*(\d+(?:\.\d+)?)\s*(?:لـ?|إلى|الي)\s*(\d+(?:\.\d+)?)/
  );

  if (updateMatchEn || updateMatchAr) {
    const match = updateMatchEn || updateMatchAr!;
    const searchTerm = match[1].trim();
    const oldAmount = parseFloat(match[2]);
    const newAmount = parseFloat(match[3]);

    return {
      type: 'update_transaction',
      raw_text: rawInput,
      confidence: 0.9,
      mutation_target: {
        search_term: searchTerm,
        target_amount: oldAmount,
        new_amount: newAmount,
        action: 'update',
      },
    };
  }

  // 5. Delete transaction command
  // "Delete the coffee transaction" / "احذف مصروف القهوة" / "امسح معاملة القهوة"
  const deleteMatchEn = normalized.match(/(?:delete|remove) (?:the )?([a-zA-Z\s]+?)(?: expense| transaction)?$/i);
  const deleteMatchAr = normalized.match(/(?:احذف|امسح|إلغاء) (?:مصروف|معاملة)?\s*([^\d]+)$/);

  if (deleteMatchEn || deleteMatchAr) {
    const match = deleteMatchEn || deleteMatchAr!;
    const searchTerm = match[1].trim();

    return {
      type: 'delete_transaction',
      raw_text: rawInput,
      confidence: 0.9,
      mutation_target: {
        search_term: searchTerm,
        action: 'delete',
      },
    };
  }

  return null;
}

/**
 * Splits a composite sentence into individual transaction clauses.
 * Handles conjunctions: "and", "و", commas ",", semicolons ";", "ثم", "plus".
 */
export function splitClauses(input: string): string[] {
  // Normalize arabic digits first
  const normalized = normalizeArabicNumbers(input.trim());

  // Split on delimiters while being mindful of arabic 'و' (which can be attached to words or spaced)
  // Replace ', and', ' and ', ';', '،', ' plus ' with a sentinel delimiter
  let clean = normalized
    .replace(/,\s*(?:and|و)\s*/gi, ' | ')
    .replace(/\s+and\s+/gi, ' | ')
    .replace(/[;؛]/g, ' | ')
    .replace(/,/g, ' | ')
    .replace(/\s+ثم\s+/g, ' | ')
    .replace(/\s+plus\s+/gi, ' | ');

  // Handle Arabic standalone or attached ' و ' before another expense keyword or number
  // e.g. "و 30 جنيه مواصلات" or "و30 جنيه"
  clean = clean.replace(/\s+و(?=\s*\d+)/g, ' | ');

  const clauses = clean
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return clauses.length > 0 ? clauses : [normalized];
}

/**
 * Extracts a single transaction item from a clause.
 */
export function parseSingleClause(
  clause: string,
  defaultCurrency: CurrencyCode = 'EGP'
): ParsedItem | null {
  const normalized = normalizeArabicNumbers(clause.trim());
  const currency = extractCurrency(normalized, defaultCurrency);

  // Detect type: income vs expense
  const isIncome =
    /received|earned|got|income|salary|allowance|gift/i.test(normalized) ||
    /استلمت|قبضت|جالي|دخل|راتب|مرتب|عيدية|مكافأة/i.test(normalized);
  const type: TransactionType = isIncome ? 'income' : 'expense';

  // Extract amount: find first number with optional decimal point
  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!amountMatch) {
    return null;
  }

  const amount = parseFloat(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  // Extract description: remove amount, currency keywords, and common filler verbs/prepositions
  const cleanDescription = normalized
    // Remove amount
    .replace(amountMatch[0], '')
    // Remove currency keywords
    .replace(/\b(egp|le|pound|pounds|bucks|usd|eur|sar|aed|gbp)\b/gi, '')
    .replace(/(جنيه|ج\.م|ج|دولار|يورو|ريال|درهم)/g, '')
    // Remove common expense/income action verbs
    .replace(/\b(i spent|spent|paid|bought|cost|charged|i received|received|got)\b/gi, '')
    .replace(/(صرفت|دفعت|اشتريت|جبت|حاسبت|خلصت|استلمت|قبضت|أخذت|اخذت)/g, '')
    // Remove prepositions like "on", "for", "على", "في", "لـ"
    .replace(/\b(on|for|in|at)\b/gi, '')
    .replace(/(على|علي|في|بـ|لـ)/g, '')
    // Clean extra punctuation and spaces
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Match category
  const categoryMatch = matchCategory(normalized, type);

  // Determine if item needs manual review
  let needsReview = false;
  let reviewReason = '';

  if (categoryMatch.confidence === 'low') {
    needsReview = true;
    reviewReason = 'Unclear category (defaulted to Other). Please verify.';
  } else if (!cleanDescription || cleanDescription.length < 2) {
    needsReview = true;
    reviewReason = 'Description is very brief or missing.';
  } else if (amount > 5000) {
    // Large amount sanity check
    needsReview = true;
    reviewReason = 'Large transaction amount. Please verify.';
  }

  const fallbackDesc =
    cleanDescription ||
    (type === 'income' ? 'Income' : categoryMatch.categoryName);

  return {
    temp_id: generateUUID(),
    description: fallbackDesc.charAt(0).toUpperCase() + fallbackDesc.slice(1),
    amount,
    currency,
    category_id: categoryMatch.categoryId,
    category_name: categoryMatch.categoryName,
    category_confidence: categoryMatch.confidence,
    type,
    transaction_date: getTodayDateString(),
    original_text: clause,
    needs_review: needsReview,
    needsReview,
    reviewReason: needsReview ? reviewReason : undefined,
  };
}

/**
 * Main parser entry point.
 * Parses any natural language user input into either a conversational command or a list of proposed transactions.
 */
export function parseNaturalLanguageInput(
  input: string,
  defaultCurrency: CurrencyCode = 'EGP'
): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      type: 'unknown',
      raw_text: input,
      confidence: 0,
      feedback_message: 'Please enter a transaction or command.',
      feedback_message_ar: 'يرجى إدخال معاملة أو أمر.',
    };
  }

  // 1. Try conversational command parser first
  const command = parseConversationalCommand(trimmed, defaultCurrency);
  if (command) {
    return command;
  }

  // 2. Parse as one or more transactions
  const clauses = splitClauses(trimmed);
  const items: ParsedItem[] = [];

  for (const clause of clauses) {
    const parsed = parseSingleClause(clause, defaultCurrency);
    if (parsed) {
      items.push(parsed);
    }
  }

  if (items.length > 0) {
    return {
      type: 'create_transactions',
      raw_text: trimmed,
      confidence: 0.9,
      items,
      feedback_message: `Found ${items.length} proposed transaction${items.length > 1 ? 's' : ''}. Review and confirm below.`,
      feedback_message_ar: `تم التعرف على ${items.length} معاملة مقترحة. راجع وأكد أدناه.`,
    };
  }

  // Fallback: couldn't find an amount or recognized structure
  return {
    type: 'unknown',
    raw_text: trimmed,
    confidence: 0,
    feedback_message:
      'Could not detect an amount or transaction details. Try: "I spent 85 EGP on lunch" or "صرفت 85 جنيه غدا".',
    feedback_message_ar:
      'لم يتم العثور على مبلغ أو تفاصيل المعاملة. جرب: "صرفت 85 جنيه على الغدا" أو "I spent 85 EGP on lunch".',
  };
}
