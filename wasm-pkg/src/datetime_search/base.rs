//! 日時探索空間の候補を SHA-1 SIMD 入力へ変換する。
use crate::core::datetime::{DatetimeSearchIter, DatetimeSearchSpace, date_to_days};
use crate::core::datetime_codes::{get_date_code, get_time_code_for_hardware};
use crate::core::sha1::{
    BaseMessageBuilder, HashValues, calculate_pokemon_sha1_simd, get_frame, get_nazo_values,
};
use crate::types::{Datetime, DsConfig, Hardware, StartupCondition};

pub struct DatetimeHashGenerator {
    base_message: [u32; 16],
    datetimes: DatetimeSearchIter,
    is_ds_or_lite: bool,
    cached_date: Option<((u16, u8, u8), u32)>,
}

impl DatetimeHashGenerator {
    pub fn new(ds: &DsConfig, space: &DatetimeSearchSpace, condition: StartupCondition) -> Self {
        let builder = BaseMessageBuilder::new(
            &get_nazo_values(ds),
            ds.mac,
            condition.vcount,
            condition.timer0,
            condition.key_code(),
            get_frame(ds.hardware, ds.version),
        );
        Self {
            base_message: builder.to_message(),
            datetimes: space.iter(),
            is_ds_or_lite: matches!(ds.hardware, Hardware::Ds | Hardware::DsLite),
            cached_date: None,
        }
    }

    pub(crate) fn next_quad(&mut self) -> ([(Datetime, HashValues); 4], u8) {
        let mut datetimes = [Datetime::default(); 4];
        let mut date_codes = [0; 4];
        let mut time_codes = [0; 4];
        let mut len = 0u8;
        for i in 0..4 {
            let Some(datetime) = self.datetimes.next() else {
                break;
            };
            let date = (datetime.year, datetime.month, datetime.day);
            let date_code = match self.cached_date {
                Some((cached, code)) if cached == date => code,
                _ => {
                    let code = get_date_code(date_to_days(date.0, date.1, date.2));
                    self.cached_date = Some((date, code));
                    code
                }
            };
            datetimes[i] = datetime;
            date_codes[i] = date_code;
            time_codes[i] = get_time_code_for_hardware(
                u32::from(datetime.hour) * 3600
                    + u32::from(datetime.minute) * 60
                    + u32::from(datetime.second),
                self.is_ds_or_lite,
            );
            len += 1;
        }
        if len == 0 {
            return (Default::default(), 0);
        }
        let hashes = calculate_pokemon_sha1_simd(date_codes, time_codes, &self.base_message);
        (std::array::from_fn(|i| (datetimes[i], hashes[i])), len)
    }

    pub(crate) fn is_exhausted(&self) -> bool {
        self.datetimes.is_exhausted()
    }
}
