export interface OrderRoomMessage {
  id: string;
  orderId: string;
  from: string;
  body: string;
  ts: string;
}

const messagesByOrder = new Map<string, OrderRoomMessage[]>();

function nowTs(): string {
  return new Date().toISOString();
}

export function listOrderRoomMessages(orderId: string): OrderRoomMessage[] {
  return [...(messagesByOrder.get(orderId) ?? [])];
}

export function addOrderRoomMessage(input: {
  orderId: string;
  from: string;
  body: string;
}): OrderRoomMessage {
  const msg: OrderRoomMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orderId: input.orderId,
    from: input.from,
    body: input.body,
    ts: nowTs(),
  };
  const list = messagesByOrder.get(input.orderId) ?? [];
  list.push(msg);
  messagesByOrder.set(input.orderId, list);
  return msg;
}

export function seedOrderRoomSystemMessage(orderId: string, body: string): OrderRoomMessage {
  return addOrderRoomMessage({ orderId, from: "SYSTEM", body });
}

export function resetOrderRoomForTest(): void {
  messagesByOrder.clear();
}
