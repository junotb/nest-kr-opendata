import { KMA_DATA_TYPES } from '../constants/kma-vilage-fcst.constants';

/** KMA 단기예보 API가 허용하는 데이터 형식 */
export type KmaDataType = (typeof KMA_DATA_TYPES)[number];

/** KMA 외부 응답 원문의 개별 예보 아이템 타입 */
type KmaVilageFcstApiRawItem = {
  baseDate: string;
  baseTime: string;
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
  nx: number;
  ny: number;
};

/** 외부 KMA API 응답 원문의 최소 envelope 타입 */
export type KmaVilageFcstApiEnvelope = {
  response?: {
    header?: {
      /** 처리 결과 코드(예: 00, 30, 31) */
      resultCode?: string;
      /** 처리 결과 메시지 */
      resultMsg?: string;
    };
    body?: {
      /** API 응답 포맷(JSON/XML) */
      dataType?: KmaDataType;
      /** 페이지 번호 */
      pageNo?: number;
      /** 페이지당 건수 */
      numOfRows?: number;
      /** 전체 건수 */
      totalCount?: number;
      items?: {
        /** item이 배열 또는 단일 객체로 내려올 수 있음 */
        item?: KmaVilageFcstApiRawItem[] | KmaVilageFcstApiRawItem;
      };
    };
  };
};
