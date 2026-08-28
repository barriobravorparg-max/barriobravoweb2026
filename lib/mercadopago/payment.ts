import { Payment } from "mercadopago";
import { getMercadoPagoClient } from "./client";

export interface MpPayment {
  id: number;
  status: string;
  metadata: Record<string, unknown>;
}

export async function getPayment(paymentId: string): Promise<MpPayment> {
  const payment = new Payment(getMercadoPagoClient());
  const result = await payment.get({ id: paymentId });

  return {
    id: result.id as number,
    status: result.status as string,
    metadata: (result.metadata as Record<string, unknown>) ?? {},
  };
}
