pub const CONFIG_SEED: &[u8] = b"sss-config";
pub const ROLE_SEED: &[u8] = b"role";
pub const MINTER_INFO_SEED: &[u8] = b"minter";
pub const RESERVE_SEED: &[u8] = b"reserve";

pub const ROLE_MINTER: u8 = 0;
pub const ROLE_BURNER: u8 = 1;
pub const ROLE_FREEZER: u8 = 2;
pub const ROLE_PAUSER: u8 = 3;
pub const ROLE_BLACKLISTER: u8 = 4;
pub const ROLE_SEIZER: u8 = 5;
pub const ROLE_ATTESTOR: u8 = 6;
pub const ROLE_MAX: u8 = 6;

pub const PRESET_SSS1: u8 = 1;
pub const PRESET_SSS2: u8 = 2;
