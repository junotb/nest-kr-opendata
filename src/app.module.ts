import { Module } from '@nestjs/common';
import { KmaVilageFcstModule } from './modules/kma-vilage-fcst/kma-vilage-fcst.module';

@Module({
  imports: [KmaVilageFcstModule],
})
export class AppModule {}
