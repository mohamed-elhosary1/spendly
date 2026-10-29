import { describe, it, expect } from 'vitest';
import {
  parseNaturalLanguageInput,
  splitClauses,
  parseSingleClause,
  matchCategory,
} from '@/lib/parser';
import { normalizeArabicNumbers } from '@/lib/currency';

describe('Natural Language Transaction Parser', () => {
  it('correctly normalizes Arabic Eastern numerals to Western digits', () => {
    expect(normalizeArabicNumbers('١٢٣.٤٥')).toBe('123.45');
    expect(normalizeArabicNumbers('صرفت ٨٥ جنيه')).toBe('صرفت 85 جنيه');
  });

  it('splits composite multi-transaction phrases separated by commas and conjunctions', () => {
    const input = 'I spent 85 EGP on lunch, 30 EGP on transportation, and 20 EGP on coffee';
    const clauses = splitClauses(input);
    expect(clauses.length).toBe(3);
  });

  it('splits Arabic multi-transaction phrases', () => {
    const input = 'صرفت 85 جنيه على الغدا و 30 جنيه مواصلات و 20 جنيه قهوة';
    const clauses = splitClauses(input);
    expect(clauses.length).toBe(3);
  });

  it('parses single English transaction accurately', () => {
    const item = parseSingleClause('85 EGP on lunch', 'EGP');
    expect(item).not.toBeNull();
    expect(item?.amount).toBe(85);
    expect(item?.currency).toBe('EGP');
    expect(item?.type).toBe('expense');
    expect(item?.category_name).toBe('Food & Drinks');
  });

  it('parses Egyptian Arabic expense phrase accurately', () => {
    const item = parseSingleClause('صرفت 250 جنيه على النت', 'EGP');
    expect(item).not.toBeNull();
    expect(item?.amount).toBe(250);
    expect(item?.type).toBe('expense');
    expect(item?.category_name).toBe('Internet & Telecom');
  });

  it('parses income transaction phrases correctly', () => {
    const item = parseSingleClause('I received 1500 EGP salary', 'EGP');
    expect(item).not.toBeNull();
    expect(item?.amount).toBe(1500);
    expect(item?.type).toBe('income');
    expect(item?.category_name).toBe('Salary');
  });

  it('parses the full 3-item test case from product requirements', () => {
    const input = 'I spent 85 EGP on lunch, 30 EGP on transportation, and 20 EGP on coffee.';
    const res = parseNaturalLanguageInput(input, 'EGP');
    expect(res.type).toBe('create_transactions');
    expect(res.items?.length).toBe(3);

    const lunch = res.items?.find((i) => i.amount === 85);
    expect(lunch).toBeDefined();
    expect(lunch?.category_name).toBe('Food & Drinks');

    const transport = res.items?.find((i) => i.amount === 30);
    expect(transport).toBeDefined();
    expect(transport?.category_name).toBe('Transportation');

    const coffee = res.items?.find((i) => i.amount === 20);
    expect(coffee).toBeDefined();
    expect(coffee?.category_name).toBe('Food & Drinks');
  });

  it('detects conversational query commands', () => {
    const q1 = parseNaturalLanguageInput('How much did I spend today?');
    expect(q1.type).toBe('query_today');

    const q1Ar = parseNaturalLanguageInput('كم صرفت اليوم؟');
    expect(q1Ar.type).toBe('query_today');

    const q2 = parseNaturalLanguageInput('How much budget do I have left?');
    expect(q2.type).toBe('query_budget');

    const q2Ar = parseNaturalLanguageInput('كم الميزانية المتبقية؟');
    expect(q2Ar.type).toBe('query_budget');
  });

  it('detects update and delete commands with target identification', () => {
    const updateCmd = parseNaturalLanguageInput('Change the lunch expense from 85 to 70 EGP');
    expect(updateCmd.type).toBe('update_transaction');
    expect(updateCmd.mutation_target?.search_term.toLowerCase()).toContain('lunch');
    expect(updateCmd.mutation_target?.target_amount).toBe(85);
    expect(updateCmd.mutation_target?.new_amount).toBe(70);

    const deleteCmd = parseNaturalLanguageInput('Delete the coffee transaction');
    expect(deleteCmd.type).toBe('delete_transaction');
    expect(deleteCmd.mutation_target?.search_term.toLowerCase()).toContain('coffee');
  });

  it('flags ambiguous input or low confidence category for review', () => {
    const res = parseNaturalLanguageInput('I spent 9999 EGP on something vague');
    expect(res.type).toBe('create_transactions');
    expect(res.items?.[0].needsReview).toBe(true);
  });
});
