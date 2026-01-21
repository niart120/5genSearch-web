//! BCD (Binary-Coded Decimal) 変換

/// 数値を BCD に変換 (0-99)
#[inline]
pub const fn to_bcd(value: u8) -> u8 {
    ((value / 10) << 4) | (value % 10)
}

/// BCD を数値に変換
#[inline]
pub const fn from_bcd(bcd: u8) -> u8 {
    ((bcd >> 4) * 10) + (bcd & 0x0F)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_bcd() {
        assert_eq!(to_bcd(0), 0x00);
        assert_eq!(to_bcd(9), 0x09);
        assert_eq!(to_bcd(10), 0x10);
        assert_eq!(to_bcd(23), 0x23);
        assert_eq!(to_bcd(59), 0x59);
        assert_eq!(to_bcd(99), 0x99);
    }

    #[test]
    fn test_from_bcd() {
        assert_eq!(from_bcd(0x00), 0);
        assert_eq!(from_bcd(0x09), 9);
        assert_eq!(from_bcd(0x10), 10);
        assert_eq!(from_bcd(0x23), 23);
        assert_eq!(from_bcd(0x59), 59);
        assert_eq!(from_bcd(0x99), 99);
    }

    #[test]
    fn test_roundtrip() {
        for i in 0..=99 {
            assert_eq!(from_bcd(to_bcd(i)), i);
        }
    }
}
