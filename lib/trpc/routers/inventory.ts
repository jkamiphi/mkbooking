import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../init";
import {
  assetFaceStatusSchema,
  assetStatusSchema,
  createAssetFaceSchema,
  createAssetSchema,
  createFacePositionSchema,
  createMaintenanceWindowSchema,
  createMountingTypeSchema,
  createPermitSchema,
  createProvinceSchema,
  createRestrictionTagSchema,
  createRoadTypeSchema,
  createStructureTypeSchema,
  createZoneSchema,
  occupancyStatusSchema,
  upsertProductionSpecSchema,
  updateAssetFaceSchema,
  updateAssetSchema,
  updateStructureTypeSchema,
  updateZoneSchema,
  listAssets,
  listAssetControlRows,
  getAssetById,
  listAssetFaces,
  getAssetFaceById,
  listFacePositions,
  listMaintenanceWindows,
  listMountingTypes,
  listPermits,
  listProvinces,
  listRestrictionTags,
  listRoadTypes,
  listStructureTypes,
  listZones,
  getInventoryOverview,
  createAsset,
  createAssetFace,
  createFacePosition,
  createMaintenanceWindow,
  createMountingType,
  createPermit,
  createProvince,
  createRestrictionTag,
  createRoadType,
  createStructureType,
  createZone,
  updateAsset,
  updateAssetFace,
  updateStructureType,
  updateZone,
  upsertProductionSpec,
} from "@/lib/services/inventory";

const listZonesInputSchema = z
  .object({
    provinceId: z.string().optional(),
  })
  .optional();

export const inventoryRouter = router({
  overview: adminProcedure.query(async () => {
    return getInventoryOverview();
  }),

  provinces: router({
    list: adminProcedure.query(async () => {
      return listProvinces();
    }),
    create: adminProcedure
      .input(createProvinceSchema)
      .mutation(async ({ input }) => {
        return createProvince(input);
      }),
  }),

  zones: router({
    list: adminProcedure
      .input(listZonesInputSchema)
      .query(async ({ input }) => {
        return listZones(input);
      }),
    publicList: publicProcedure
      .input(listZonesInputSchema)
      .query(async ({ input }) => {
        return listZones(input);
      }),
    create: adminProcedure.input(createZoneSchema).mutation(async ({ input }) => {
      return createZone(input);
    }),
    update: adminProcedure.input(updateZoneSchema).mutation(async ({ input }) => {
      return updateZone(input);
    }),
  }),

  structureTypes: router({
    list: adminProcedure.query(async () => {
      return listStructureTypes();
    }),
    publicList: publicProcedure.query(async () => {
      return listStructureTypes();
    }),
    create: adminProcedure
      .input(createStructureTypeSchema)
      .mutation(async ({ input }) => {
        return createStructureType(input);
      }),
    update: adminProcedure
      .input(updateStructureTypeSchema)
      .mutation(async ({ input }) => {
        return updateStructureType(input);
      }),
  }),

  roadTypes: router({
    list: adminProcedure.query(async () => {
      return listRoadTypes();
    }),
    create: adminProcedure
      .input(createRoadTypeSchema)
      .mutation(async ({ input }) => {
        return createRoadType(input);
      }),
  }),

  facePositions: router({
    list: adminProcedure.query(async () => {
      return listFacePositions();
    }),
    create: adminProcedure
      .input(createFacePositionSchema)
      .mutation(async ({ input }) => {
        return createFacePosition(input);
      }),
  }),

  mountingTypes: router({
    list: adminProcedure.query(async () => {
      return listMountingTypes();
    }),
    create: adminProcedure
      .input(createMountingTypeSchema)
      .mutation(async ({ input }) => {
        return createMountingType(input);
      }),
  }),

  restrictionTags: router({
    list: adminProcedure.query(async () => {
      return listRestrictionTags();
    }),
    create: adminProcedure
      .input(createRestrictionTagSchema)
      .mutation(async ({ input }) => {
        return createRestrictionTag(input);
      }),
  }),

  assets: router({
    list: adminProcedure
      .input(
        z
          .object({
            status: assetStatusSchema.optional(),
            search: z.string().optional(),
            structureTypeId: z.string().optional(),
            zoneId: z.string().optional(),
            roadTypeId: z.string().optional(),
            skip: z.number().min(0).default(0),
            take: z.number().min(1).max(100).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listAssets(input);
      }),
    controlList: adminProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            structureTypeId: z.string().optional(),
            zoneId: z.string().optional(),
            provinceId: z.string().optional(),
            occupancyStatus: occupancyStatusSchema.optional(),
            skip: z.number().min(0).default(0),
            take: z.number().min(1).max(100).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listAssetControlRows(input);
      }),
    get: adminProcedure
      .input(
        z.object({
          id: z.string().min(1),
        })
      )
      .query(async ({ input }) => {
        return getAssetById(input.id);
      }),
    create: adminProcedure.input(createAssetSchema).mutation(async ({ input }) => {
      return createAsset(input);
    }),
    update: adminProcedure.input(updateAssetSchema).mutation(async ({ input }) => {
      return updateAsset(input);
    }),
  }),

  faces: router({
    list: adminProcedure
      .input(
        z
          .object({
            assetId: z.string().optional(),
            status: assetFaceStatusSchema.optional(),
            skip: z.number().min(0).default(0),
            take: z.number().min(1).max(100).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listAssetFaces(input);
      }),
    get: adminProcedure
      .input(
        z.object({
          id: z.string().min(1),
        })
      )
      .query(async ({ input }) => {
        return getAssetFaceById(input.id);
      }),
    create: adminProcedure
      .input(createAssetFaceSchema)
      .mutation(async ({ input }) => {
        return createAssetFace(input);
      }),
    update: adminProcedure
      .input(updateAssetFaceSchema)
      .mutation(async ({ input }) => {
        return updateAssetFace(input);
      }),
  }),

  productionSpecs: router({
    upsert: adminProcedure
      .input(upsertProductionSpecSchema)
      .mutation(async ({ input }) => {
        return upsertProductionSpec(input);
      }),
  }),

  permits: router({
    list: adminProcedure
      .input(
        z
          .object({
            assetId: z.string().optional(),
            faceId: z.string().optional(),
            take: z.number().min(1).max(200).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listPermits(input);
      }),
    create: adminProcedure.input(createPermitSchema).mutation(async ({ input }) => {
      return createPermit(input);
    }),
  }),

  maintenanceWindows: router({
    list: adminProcedure
      .input(
        z
          .object({
            assetId: z.string().optional(),
            faceId: z.string().optional(),
            take: z.number().min(1).max(200).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listMaintenanceWindows(input);
      }),
    create: adminProcedure
      .input(createMaintenanceWindowSchema)
      .mutation(async ({ input }) => {
        return createMaintenanceWindow(input);
      }),
  }),
});
