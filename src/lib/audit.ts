import type { Prisma } from "@/generated/prisma";

type TxClient = Prisma.TransactionClient;

export async function recordStatusChange(
  tx: TxClient,
  params: {
    stepId: number;
    productId: number;
    oldStatus: string | null;
    newStatus: string;
    changedByUserId: string | null;
    note?: string | null;
  }
) {
  if (params.oldStatus === params.newStatus) return null;

  return tx.stepHistory.create({
    data: {
      stepId: params.stepId,
      productId: params.productId,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      changedByUserId: params.changedByUserId,
      note: params.note ?? null,
    },
  });
}
