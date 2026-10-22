// 국가 표시: MLB Stats API 의 birthCountry 표기 → 3글자 코드, 국기 이모지(ISO 3166-1 alpha-2), 한/영 이름.
// 코드는 올림픽(IOC) 표기를 따른다. 목록에 없는 나라는 영문 앞 세 글자 + 국기 없음.

interface NationInfo {
  code: string;
  iso2: string | null;
  ko: string;
  en: string;
}

const NATIONS: Record<string, NationInfo> = {
  USA: { code: 'USA', iso2: 'US', ko: '미국', en: 'United States' },
  'Dominican Republic': { code: 'DOM', iso2: 'DO', ko: '도미니카공화국', en: 'Dominican Republic' },
  Venezuela: { code: 'VEN', iso2: 'VE', ko: '베네수엘라', en: 'Venezuela' },
  Cuba: { code: 'CUB', iso2: 'CU', ko: '쿠바', en: 'Cuba' },
  'Puerto Rico': { code: 'PUR', iso2: 'PR', ko: '푸에르토리코', en: 'Puerto Rico' },
  Canada: { code: 'CAN', iso2: 'CA', ko: '캐나다', en: 'Canada' },
  Mexico: { code: 'MEX', iso2: 'MX', ko: '멕시코', en: 'Mexico' },
  Panama: { code: 'PAN', iso2: 'PA', ko: '파나마', en: 'Panama' },
  Japan: { code: 'JPN', iso2: 'JP', ko: '일본', en: 'Japan' },
  'Republic of Korea': { code: 'KOR', iso2: 'KR', ko: '대한민국', en: 'Korea' },
  'South Korea': { code: 'KOR', iso2: 'KR', ko: '대한민국', en: 'Korea' },
  Colombia: { code: 'COL', iso2: 'CO', ko: '콜롬비아', en: 'Colombia' },
  Curacao: { code: 'CUW', iso2: 'CW', ko: '퀴라소', en: 'Curaçao' },
  Aruba: { code: 'ARU', iso2: 'AW', ko: '아루바', en: 'Aruba' },
  Bahamas: { code: 'BAH', iso2: 'BS', ko: '바하마', en: 'Bahamas' },
  Taiwan: { code: 'TPE', iso2: 'TW', ko: '대만', en: 'Taiwan' },
  Australia: { code: 'AUS', iso2: 'AU', ko: '호주', en: 'Australia' },
  Germany: { code: 'GER', iso2: 'DE', ko: '독일', en: 'Germany' },
  Honduras: { code: 'HON', iso2: 'HN', ko: '온두라스', en: 'Honduras' },
  Nicaragua: { code: 'NCA', iso2: 'NI', ko: '니카라과', en: 'Nicaragua' },
  Brazil: { code: 'BRA', iso2: 'BR', ko: '브라질', en: 'Brazil' },
  Netherlands: { code: 'NED', iso2: 'NL', ko: '네덜란드', en: 'Netherlands' },
  Jamaica: { code: 'JAM', iso2: 'JM', ko: '자메이카', en: 'Jamaica' },
  'U.S. Virgin Islands': { code: 'ISV', iso2: 'VI', ko: '미국령 버진아일랜드', en: 'U.S. Virgin Islands' },
  'Virgin Islands': { code: 'ISV', iso2: 'VI', ko: '미국령 버진아일랜드', en: 'U.S. Virgin Islands' },
  Peru: { code: 'PER', iso2: 'PE', ko: '페루', en: 'Peru' },
  'South Africa': { code: 'RSA', iso2: 'ZA', ko: '남아프리카공화국', en: 'South Africa' },
  'United Kingdom': { code: 'GBR', iso2: 'GB', ko: '영국', en: 'Great Britain' },
  Italy: { code: 'ITA', iso2: 'IT', ko: '이탈리아', en: 'Italy' },
  Spain: { code: 'ESP', iso2: 'ES', ko: '스페인', en: 'Spain' },
  France: { code: 'FRA', iso2: 'FR', ko: '프랑스', en: 'France' },
  Belgium: { code: 'BEL', iso2: 'BE', ko: '벨기에', en: 'Belgium' },
  Lithuania: { code: 'LTU', iso2: 'LT', ko: '리투아니아', en: 'Lithuania' },
  'Czech Republic': { code: 'CZE', iso2: 'CZ', ko: '체코', en: 'Czechia' },
  Israel: { code: 'ISR', iso2: 'IL', ko: '이스라엘', en: 'Israel' },
  China: { code: 'CHN', iso2: 'CN', ko: '중국', en: 'China' },
  Philippines: { code: 'PHI', iso2: 'PH', ko: '필리핀', en: 'Philippines' },
  Nigeria: { code: 'NGR', iso2: 'NG', ko: '나이지리아', en: 'Nigeria' },
};

/** ISO alpha-2 → 국기 이모지 (지역 표시 문자 두 개) */
export function flagEmoji(iso2: string | null | undefined): string {
  if (!iso2 || !/^[A-Za-z]{2}$/.test(iso2)) return '';
  const base = 0x1f1e6 - 'A'.charCodeAt(0);
  return String.fromCodePoint(...iso2.toUpperCase().split('').map((c) => base + c.charCodeAt(0)));
}

export function nationInfo(nation: string): NationInfo {
  return NATIONS[nation] ?? { code: nation.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '???', iso2: null, ko: nation, en: nation };
}
