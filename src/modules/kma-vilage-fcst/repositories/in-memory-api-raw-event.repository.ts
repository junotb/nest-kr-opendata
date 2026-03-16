import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ApiRawEventEntity,
  CreateApiRawEventInput,
} from '../entities/api-raw-event.entity';
import { ApiRawEventRepository } from './api-raw-event.repository';

@Injectable()
export class InMemoryApiRawEventRepository implements ApiRawEventRepository {
  private readonly eventsByUniqueKey = new Map<string, ApiRawEventEntity>();

  upsert(input: CreateApiRawEventInput): Promise<ApiRawEventEntity> {
    const now = new Date();
    const uniqueKey = this.buildUniqueKey(input);
    const existing = this.eventsByUniqueKey.get(uniqueKey);

    if (existing) {
      const updated: ApiRawEventEntity = {
        ...existing,
        ...input,
        updatedAt: now,
      };
      this.eventsByUniqueKey.set(uniqueKey, updated);
      return Promise.resolve(updated);
    }

    const created: ApiRawEventEntity = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.eventsByUniqueKey.set(uniqueKey, created);
    return Promise.resolve(created);
  }

  deleteExpired(now: Date): Promise<number> {
    let deletedCount = 0;
    for (const [uniqueKey, event] of this.eventsByUniqueKey.entries()) {
      if (event.expiresAt < now) {
        this.eventsByUniqueKey.delete(uniqueKey);
        deletedCount += 1;
      }
    }
    return Promise.resolve(deletedCount);
  }

  private buildUniqueKey(input: CreateApiRawEventInput): string {
    return [
      input.provider,
      input.endpoint,
      input.requestSignature,
      input.baseDate,
      input.baseTime,
    ].join(':');
  }
}
