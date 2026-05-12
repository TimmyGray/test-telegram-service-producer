export abstract class ISenderService {
  abstract sendMessage(message: IMessage): Promise<ISendMessageResult>;
}

export interface IMessage {
  userId: number;
  text: string;
}

export interface ISenderEvent {
  eventId: string;
  occurredAt: string;
  payload: IMessage;
}

export interface ISendMessageResult {
  eventId: string;
  confirmed: boolean;
  attempts: number;
}
