import {
  ApiRawEventEntity,
  CreateApiRawEventInput,
} from '../entities/api-raw-event.entity';

export const API_RAW_EVENT_REPOSITORY = Symbol('API_RAW_EVENT_REPOSITORY');

export type ApiRawEventRepository = {
  upsert(input: CreateApiRawEventInput): Promise<ApiRawEventEntity>;
  deleteExpired(now: Date): Promise<number>;
};
