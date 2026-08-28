import { MercadoPagoConfig } from "mercadopago";

export function getMercadoPagoClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta la variable de entorno MERCADOPAGO_ACCESS_TOKEN");
  }
  return new MercadoPagoConfig({ accessToken });
}
