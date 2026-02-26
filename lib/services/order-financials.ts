import type { Prisma } from "@prisma/client";

export const ORDER_TAX_RATE = 0.07;

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateOrderTotals(params: {
  lineItemsSubtotal: number;
  serviceItemsSubtotal: number;
}) {
  const rentalSubtotal = roundMoney(params.lineItemsSubtotal);
  const servicesSubtotal = roundMoney(params.serviceItemsSubtotal);
  const subTotal = roundMoney(rentalSubtotal + servicesSubtotal);
  const tax = roundMoney(subTotal * ORDER_TAX_RATE);
  const total = roundMoney(subTotal + tax);

  return {
    rentalSubtotal,
    servicesSubtotal,
    subTotal,
    tax,
    total,
  };
}

export async function recalculateOrderTotals(
  tx: Prisma.TransactionClient,
  orderId: string
) {
  const [lineItems, serviceItems] = await Promise.all([
    tx.orderLineItem.findMany({
      where: { orderId },
      select: { subtotal: true },
    }),
    tx.orderServiceItem.findMany({
      where: { orderId },
      select: { subtotal: true },
    }),
  ]);

  const lineItemsSubtotal = lineItems.reduce(
    (sum, item) => sum + toNumber(item.subtotal),
    0
  );
  const serviceItemsSubtotal = serviceItems.reduce(
    (sum, item) => sum + toNumber(item.subtotal),
    0
  );

  const totals = calculateOrderTotals({
    lineItemsSubtotal,
    serviceItemsSubtotal,
  });

  const order = await tx.order.update({
    where: { id: orderId },
    data: {
      subTotal: totals.subTotal,
      tax: totals.tax,
      total: totals.total,
    },
  });

  return { order, totals };
}
