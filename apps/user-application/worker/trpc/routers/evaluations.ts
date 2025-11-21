import { z } from "zod";

import {
  getEvaluations,
  getNotAvailableEvaluations,
} from "@repo/data-ops/queries/evaluations";

import { t } from "@/worker/trpc/trpc-instance";

export const evaluationsTrpcRoutes = t.router({
  problematicDestinations: t.procedure.query(async ({ ctx }) => {
    return getNotAvailableEvaluations('testAccountId'); // ctx.userInfo.userId
  }),
  recentEvaluations: t.procedure
    .input(
      z
        .object({
          createdBefore: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx }) => {
      //ctx.userInfo.userId;
      const evaluations = await getEvaluations('testAccountId');

      const oldestCreatedAt =
        evaluations.length > 0
          ? evaluations[evaluations.length - 1].createdAt
          : null;

      return {
        data: evaluations,
        oldestCreatedAt,
      };
    }),
});
