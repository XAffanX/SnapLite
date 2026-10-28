use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorMeta {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub is_primary: bool,
    pub x: i32,
    pub y: i32,
}

#[cfg(target_os = "windows")]
pub fn list_monitors() -> Vec<MonitorMeta> {
    use windows::Win32::Foundation::{BOOL, LPARAM, RECT};
    use windows::Win32::Graphics::Gdi::{
        EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFOEXW,
    };

    let mut monitors: Vec<MonitorMeta> = Vec::new();

    unsafe extern "system" fn monitor_enum_proc(
        hmonitor: HMONITOR,
        _hdc: HDC,
        _rect: *mut RECT,
        lparam: LPARAM,
    ) -> BOOL {
        let list_ptr = lparam.0 as *mut Vec<MonitorMeta>;
        let list = &mut *list_ptr;

        let mut mi: MONITORINFOEXW = std::mem::zeroed();
        mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

        if GetMonitorInfoW(hmonitor, &mut mi as *mut _ as *mut _).as_bool() {
            let r = mi.monitorInfo.rcMonitor;
            let w = (r.right - r.left).abs() as u32;
            let h = (r.bottom - r.top).abs() as u32;
            let is_primary = (mi.monitorInfo.dwFlags & 1) != 0;

            let name_len = mi
                .szDevice
                .iter()
                .position(|&c| c == 0)
                .unwrap_or(mi.szDevice.len());
            let name = String::from_utf16_lossy(&mi.szDevice[..name_len]);

            list.push(MonitorMeta {
                id: format!("{:?}", hmonitor.0),
                name: if is_primary {
                    format!("{} (Primary)", name)
                } else {
                    name
                },
                width: w,
                height: h,
                scale_factor: 1.0,
                is_primary,
                x: r.left,
                y: r.top,
            });
        }
        BOOL(1)
    }

    unsafe {
        let ptr = &mut monitors as *mut Vec<MonitorMeta> as isize;
        let _ = EnumDisplayMonitors(None, None, Some(monitor_enum_proc), LPARAM(ptr));
    }

    monitors
}

#[cfg(not(target_os = "windows"))]
pub fn list_monitors() -> Vec<MonitorMeta> {
    vec![MonitorMeta {
        id: "mon_primary".into(),
        name: "Primary Display (2560x1440)".into(),
        width: 2560,
        height: 1440,
        scale_factor: 1.0,
        is_primary: true,
        x: 0,
        y: 0,
    }]
}
