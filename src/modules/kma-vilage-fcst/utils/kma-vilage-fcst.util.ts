const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const BASE_TIME_RELEASE_DELAY_MINUTES = 10;
const BASE_TIMES = [
  '0200',
  '0500',
  '0800',
  '1100',
  '1400',
  '1700',
  '2000',
  '2300',
] as const;

export type KmaBaseDateTime = {
  baseDate: string;
  baseTime: string;
};

export type KmaGridPoint = {
  nx: number;
  ny: number;
};

function toKstDate(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function fromKstDate(date: Date): Date {
  return new Date(date.getTime() - KST_OFFSET_MS);
}

function formatYyyyMmDd(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function createKstDateTime(
  baseDateKst: Date,
  hhmm: string,
  addMinutes = 0,
): Date {
  const hour = Number(hhmm.slice(0, 2));
  const minute = Number(hhmm.slice(2, 4));
  const utcDate = new Date(
    Date.UTC(
      baseDateKst.getUTCFullYear(),
      baseDateKst.getUTCMonth(),
      baseDateKst.getUTCDate(),
      hour,
      minute + addMinutes,
      0,
      0,
    ),
  );
  return fromKstDate(utcDate);
}

export function getLatestVilageFcstBaseDateTime(
  now: Date = new Date(),
): KmaBaseDateTime {
  const nowKst = toKstDate(now);
  const todayKstDate = new Date(
    Date.UTC(
      nowKst.getUTCFullYear(),
      nowKst.getUTCMonth(),
      nowKst.getUTCDate(),
    ),
  );

  for (let i = BASE_TIMES.length - 1; i >= 0; i -= 1) {
    const baseTime = BASE_TIMES[i];
    const releaseAt = createKstDateTime(
      todayKstDate,
      baseTime,
      BASE_TIME_RELEASE_DELAY_MINUTES,
    );
    if (now.getTime() >= releaseAt.getTime()) {
      return {
        baseDate: formatYyyyMmDd(todayKstDate),
        baseTime,
      };
    }
  }

  const previousDayKst = new Date(todayKstDate.getTime() - 24 * 60 * 60 * 1000);
  return {
    baseDate: formatYyyyMmDd(previousDayKst),
    baseTime: BASE_TIMES[BASE_TIMES.length - 1],
  };
}

export function convertLatLonToKmaGrid(lat: number, lon: number): KmaGridPoint {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}
