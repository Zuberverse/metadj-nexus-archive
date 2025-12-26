/**
 * Zod v3 shim for AI SDK provider-utils.
 *
 * Zod v4's `zod/v3` entry doesn't export `ZodFirstPartyTypeKind`,
 * but provider-utils expects it at runtime when parsing v3 schemas.
 * This shim supplies the enum so bundlers can resolve the import.
 */
export const ZodFirstPartyTypeKind = {
  ZodString: 'ZodString',
  ZodNumber: 'ZodNumber',
  ZodNaN: 'ZodNaN',
  ZodBigInt: 'ZodBigInt',
  ZodBoolean: 'ZodBoolean',
  ZodDate: 'ZodDate',
  ZodSymbol: 'ZodSymbol',
  ZodUndefined: 'ZodUndefined',
  ZodNull: 'ZodNull',
  ZodAny: 'ZodAny',
  ZodUnknown: 'ZodUnknown',
  ZodNever: 'ZodNever',
  ZodVoid: 'ZodVoid',
  ZodArray: 'ZodArray',
  ZodObject: 'ZodObject',
  ZodUnion: 'ZodUnion',
  ZodDiscriminatedUnion: 'ZodDiscriminatedUnion',
  ZodIntersection: 'ZodIntersection',
  ZodTuple: 'ZodTuple',
  ZodRecord: 'ZodRecord',
  ZodMap: 'ZodMap',
  ZodSet: 'ZodSet',
  ZodFunction: 'ZodFunction',
  ZodLazy: 'ZodLazy',
  ZodLiteral: 'ZodLiteral',
  ZodEnum: 'ZodEnum',
  ZodEffects: 'ZodEffects',
  ZodNativeEnum: 'ZodNativeEnum',
  ZodOptional: 'ZodOptional',
  ZodNullable: 'ZodNullable',
  ZodDefault: 'ZodDefault',
  ZodCatch: 'ZodCatch',
  ZodPromise: 'ZodPromise',
  ZodBranded: 'ZodBranded',
  ZodPipeline: 'ZodPipeline',
  ZodReadonly: 'ZodReadonly',
} as const;

export type ZodFirstPartyTypeKind =
  (typeof ZodFirstPartyTypeKind)[keyof typeof ZodFirstPartyTypeKind];
