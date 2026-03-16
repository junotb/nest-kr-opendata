import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KmaVilageFcstController } from './kma-vilage-fcst.controller';
import { KmaVilageFcstService } from './kma-vilage-fcst.service';
import { KmaVilageFcstApiClient } from './providers/kma-vilage-fcst-api-client';
import { InMemoryApiRawEventRepository } from './repositories/in-memory-api-raw-event.repository';
import { API_RAW_EVENT_REPOSITORY } from './repositories/api-raw-event.repository';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [KmaVilageFcstController],
  providers: [
    KmaVilageFcstService,
    KmaVilageFcstApiClient,
    InMemoryApiRawEventRepository,
    {
      provide: API_RAW_EVENT_REPOSITORY,
      useExisting: InMemoryApiRawEventRepository,
    },
  ],
  exports: [KmaVilageFcstService],
})
export class KmaVilageFcstModule {}
