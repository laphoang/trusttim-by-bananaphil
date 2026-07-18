# Hanoi Heart Hospital Website — RAG Knowledge Base Inventory

> Investigation of `https://benhvientimhanoi.vn/` to identify what real, public content is available to ground TrustTim's RAG knowledge base. Answers Critical Question A2 from `VAIC2026_Problem-Statement-Analysis.md` ("What are the authoritative public sources for each topic cluster, and who owns collecting them?"). Feeds directly into scoping the KB for the team's chosen slice (BHYT + procedures + booking + emergency safety).
>
> **Method:** ~10 pages fetched and inspected directly (via automated fetch that converts rendered HTML to text) across the site's main navigation categories. Not an exhaustive crawl — see "Known gaps" (Section 6) for what wasn't checked.

---

## 1. Key finding — the site has two very different content patterns

This affects *how* the team scrapes, not just *what* they'll find, so it's worth stating before the inventory:

- **`/vn/cong/thong-tin/*` pages** (About, Services, Contact/Booking guidance) are **server-rendered with real, substantial static text** — directly usable as-is, no special tooling needed.
- **`/vi/chuyen-de/*` and `/vi/chuyen-muc/*` pages** (the service pricing table, doctor work schedules, and knowledge-article listings) render as an **empty navigation shell** on a simple fetch — every one of the three such pages sampled (pricing, doctor schedules, patient-education articles) showed only menus and banners, with the actual list/table data evidently loaded client-side (JS/AJAX) after page load.
- The organizational-structure page is a **single image** (`sodo.jpg`) — no extractable text.

**Practical implication:** the two most valuable pages for the team's chosen scope — the **pricing table** and **doctor schedules** — are exactly the pages that resist simple scraping. This is a build-time decision point, covered in Section 5.

---

## 2. Full site navigation map (captured, so no one has to re-crawl this)

```
Giới thiệu (About)
  Giới thiệu chung         /vn/cong/thong-tin/gioi-thieu-chung           [rich static text — confirmed]
  Ban lãnh đạo             /vn/cong/thong-tin/ban-lanh-dao               [not yet sampled]
  Cơ cấu tổ chức           /vn/cong/thong-tin/co-cau-to-chuc             [image only — confirmed]
  Quá trình phát triển     /vn/cong/thong-tin/qua-trinh-phat-trien       [not yet sampled]

Dịch vụ (Services)
  Khoa khám bệnh tự nguyện     /vn/cong/thong-tin/khoa-kham-benh-tu-nguyen        [rich static text — confirmed]
  Chăm sóc mạch vành           /vn/cong/thong-tin/cham-soc-mach-vanh              [thin hub page — confirmed]
  Khoa dược và hiệu thuốc      /vn/cong/thong-tin/khoa-duoc-va-hieu-thuoc         [not yet sampled]
  Khám sức khỏe cá nhân/tổ chức /vn/cong/thong-tin/kham-suc-khoe-ca-nhan-va-to-chuc [not yet sampled]
  Chăm sóc tại nhà             /vn/cong/thong-tin/cham-soc-tai-nha                [not yet sampled]

Hướng dẫn khám bệnh (Examination Guidance)
  Quy trình khám chữa bệnh          /vn/cong/thong-tin/huong-dan-kham-benh              [thin hub page — confirmed]
  Bảng giá dịch vụ (PRICING)        /vi/chuyen-de/bang-gia-dich-vu/trang-1              [JS-rendered, empty on fetch — confirmed]
  Hướng dẫn liên hệ đặt lịch khám   /vn/cong/thong-tin/huong-dan-lien-he-dat-lich-kham  [rich static text — confirmed — HIGH VALUE]
  Lịch làm việc của Bác sỹ (SCHEDULES) /vi/chuyen-de/lich-lam-viec-cua-bac-sy/trang-1   [JS-rendered, empty on fetch — confirmed]

Phổ biến kiến thức (Knowledge)
  Thông tin y học                  /vi/chuyen-muc/thong-tin-y-hoc/trang-1               [not yet sampled, likely JS listing]
  Hiểu về Tim mạch                 /vi/chuyen-muc/hieu-ve-tim-mach/trang-1              [not yet sampled, likely JS listing]
  Dành cho người bệnh              /vi/chuyen-muc/danh-cho-nguoi-benh/trang-1           [JS-rendered, empty on fetch — confirmed]
  Kiến thức cho sinh viên Y Khoa    /vi/chuyen-muc/kien-thuc-cho-sinh-vien-y-khoa/trang-1 [not yet sampled]
  Kiến thức chuyên môn             /vi/chuyen-muc/kien-thuc-chuyen-mon/trang-1          [not yet sampled]

Đào tạo - Chỉ đạo tuyến / Quản lý chất lượng / Công tác xã hội / Nghiên cứu khoa học / Thông báo
  Several further sub-pages exist under these — not sampled, lower priority for TrustTim's chosen scope
  (training videos, referral guidelines, quality management, social work programs, research, announcements).
```

All URLs are relative to `https://benhvientimhanoi.vn`.

---

## 3. Data inventory table

| Page | URL | Content pattern | What's actually there |
|---|---|---|---|
| General introduction | `/vn/cong/thong-tin/gioi-thieu-chung` | Rich static text | Hospital history (est. 2001), Grade-I specialty status, 5 core specialties, scale (2 sites, 300 beds, 50 exam rooms, 3 cath labs, 4 OR), staff count, key achievements, quality standards. |
| Voluntary Examination Dept. | `/vn/cong/thong-tin/khoa-kham-benh-tu-nguyen` | Rich static text | Est. 2013; services (EKG, X-ray, blood tests, advanced cardiac imaging, stress tests, Holter, coronary CT, fetal cardiac screening); facility scale (16 rooms, 3 ultrasound rooms); independent billing system; booking via hotline/website; accepts BHYT with referral. |
| Contact & booking guidance | `/vn/cong/thong-tin/huong-dan-lien-he-dat-lich-kham` | Rich static text | **Highest-value page found** — see Section 4 for full extracted content. |
| Coronary care | `/vn/cong/thong-tin/cham-soc-mach-vanh` | Thin hub page | Only navigation links, hotline, and addresses — no service-specific detail beyond what's on the general pages. |
| Examination guidance hub | `/vn/cong/thong-tin/huong-dan-kham-benh` | Thin hub page | Functions as a directory (links to pricing, schedules, booking) rather than containing procedure steps itself. |
| Organizational structure | `/vn/cong/thong-tin/co-cau-to-chuc` | Image only | A single chart image (`sodo.jpg`); no extractable text. |
| Service pricing table | `/vi/chuyen-de/bang-gia-dich-vu/trang-1` | JS-rendered, empty on fetch | Page shell only — no prices visible without executing client-side JS. |
| Doctor work schedules | `/vi/chuyen-de/lich-lam-viec-cua-bac-sy/trang-1` | JS-rendered, empty on fetch | Page shell only — no schedule data visible without executing client-side JS. |
| Patient-education articles ("Dành cho người bệnh") | `/vi/chuyen-muc/danh-cho-nguoi-benh/trang-1` | JS-rendered, empty on fetch | Page shell only — no article titles/content visible without executing client-side JS. |

---

## 4. What's directly usable today (no special scraping tooling needed)

### Hospital overview (from the general-introduction page)
- Grade I specialty cardiovascular hospital under Hanoi Department of Health, established 2001; slogan **"FOR A HEALTHY HEART."**
- 5 core specialties: internal cardiovascular medicine, pediatric cardiology, interventional cardiology, cardiac surgery, metabolic cardiology.
- Scale: 2 locations in Hanoi, 300 inpatient beds, 50 examination rooms, 3 cardiac catheterization labs, 4 open-heart operating rooms, 589 staff.
- Notable achievement: 1,422 open-heart surgeries in 2014 (reported as #1 nationwide that year); training partnerships across provinces; international collaboration (France, Singapore); ISO 9001:2008.

### Voluntary Examination Department
- Established October 2013; positions itself as "friendly, convenient, elegant."
- Services: basic checkups (EKG, chest X-ray, routine blood tests), advanced cardiac imaging (Vivid E9 echocardiography with cardiac/4D probes), stress tests, Dobutamine echocardiography, 24-hour Holter monitoring, 128/256-slice coronary CT angiography, fetal cardiac ultrasound screening from 18 weeks.
- Two examination centers, 16 cardiac specialty rooms, 3 ultrasound rooms, dedicated vascular exam space.
- Independent financial/billing system specifically to reduce patient wait times.
- Accepts BHYT with proper referral; serves all ages.

### Contact & booking (the single most useful page found — capture verbatim)
- **Main hotline (24/7): 19001082**
- Facility 1 registration: 19001082
- Facility 2 registration: 19001082
- Polyclinic registration: 0243.758.9090 or 096.197.2097
- Social-work support: 0243.942.5880
- **Email: cskh@timhanoi.vn**
- **Facility 1: 92 Trần Hưng Đạo, Hà Nội**
- **Facility 2: 695 Lạc Long Quân, Tây Hồ, Hà Nội**
- Booking hours by phone: **Monday–Saturday, 8:00–16:00** (closed Sundays and holidays)
- Booking methods: phone, website (`https://benhvientimhanoi.vn/he-thong/hen-kham/index.html`), Zalo
- Requirements: book **≥24 hours in advance**; arrive **15 minutes early** for registration; booking must be confirmed by the hospital to be valid
- **Explicit emergency line: this booking channel is for non-emergency cases only — emergency patients should call 115.**

This last point is directly reusable for the product's emergency-escalation copy: it confirms the hospital's own public messaging already tells patients to call **115** for emergencies rather than use routine booking channels — a strong, citable anchor for TrustTim's escalation response (pending confirmation of the more detailed internal protocol, HD.25.01, per the Problem-Statement-Analysis Critical Question B6).

---

## 5. What needs more work — a build-time scraping decision

The **pricing table** and **doctor work schedules** are the two most valuable data sources for the team's chosen scope (BHYT/procedures/booking) and neither is simple-fetchable — both pages returned only an empty navigation shell; the actual data loads via client-side JS/AJAX after the initial page load.

Two realistic options, consistent with the team's already-agreed "public + synthesized" and "mocked but realistic" approach:

1. **Headless-browser scrape during the 48h** (e.g., Playwright/Puppeteer) to render the page and extract the live table/schedule data. Higher fidelity, but costs build time and isn't guaranteed to work cleanly against an unfamiliar site under time pressure.
2. **Synthesized/illustrative placeholder data**, clearly labeled as such in the demo and pitch (already the team's default stance per the Problem-Statement-Analysis) — faster and lower-risk, at the cost of not being literally live hospital data.

Recommendation: **attempt option 1 early** (it's a quick spike to test, not a big commitment) and fall back to option 2 immediately if it doesn't render cleanly within an hour — don't let this become a time sink.

---

## 6. Known gaps (not-yet-investigated, not confirmed absent)

To avoid a future task re-crawling from scratch, or wrongly assuming something doesn't exist:

- **No BHYT-specific detail page was found in the navigation.** BHYT coverage/co-pay rules will likely need to come from the hospital SOP document (`PROCEDURE_FOR_PATIENT_RECEPTION_OUTPATIENT_EXAMINATION_TREATMENT.md`) plus doctor-authored content, rather than the website.
- **Not yet sampled:** Leadership (`ban-lanh-dao`), development history (`qua-trinh-phat-trien`), pharmacy (`khoa-duoc-va-hieu-thuoc`), personal/organizational health checkups (`kham-suc-khoe-ca-nhan-va-to-chuc`), home care (`cham-soc-tai-nha`), and all "Knowledge" category articles except the one confirmed JS-rendered listing. These may contain more usable static content similar to the confirmed rich pages — worth a follow-up pass if time allows before relying solely on the SOP + doctor-authored content for those topics.
- **No robots.txt exists on the site** (404) — no crawl restrictions were declared, but also no sitemap was found to guide a more systematic crawl.

---

## 7. Recommended next actions

1. **Decide the scraping approach for pricing/schedules** (Section 5) before Jul 17 — don't leave this as a live decision during the 48h.
2. **Sample the remaining not-yet-investigated nav items** (Section 6) if there's time before the event, to find any more directly-usable static content.
3. **Hand Section 4's confirmed content to the doctor** to review and select which specific facts go into the curated, demo-ready KB — she should validate accuracy and flag anything that reads as stale or needs a caveat.
