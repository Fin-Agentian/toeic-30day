window.TOEIC_DATA = window.TOEIC_DATA || {};
window.TOEIC_DATA.p7 = (window.TOEIC_DATA.p7 || []).concat([
  { id: "p7-001", type: "single",
    passages: [ { kind: "email", title: "Email: Interview Confirmation", text: `Dear Mr. Osei,

Thank you for applying for the Marketing Assistant position at Bright Peak Solutions. We were impressed with your resume and would like to invite you to an interview.

Your interview is scheduled for Thursday, August 27, at 10:00 a.m. at our downtown office, located at 88 Harbor Road, Suite 500. The session will last about 45 minutes and will include a short writing exercise along with a conversation with two members of our marketing team.

Please bring a printed copy of your portfolio and arrive at least ten minutes early to complete a visitor sign-in form at the front desk. If the proposed time is not convenient, contact me at karen.liu@brightpeak.com by August 21 so we can arrange an alternative slot.

We look forward to meeting you.

Best regards,
Karen Liu
HR Coordinator` } ],
    questions: [
      { q: "What is the purpose of the email?",
        options: ["To offer Mr. Osei a position at the company", "To invite Mr. Osei to attend a job interview", "To ask Mr. Osei to submit more documents", "To inform Mr. Osei that the interview has been canceled"],
        answer: 1,
        explanation_zh: "信件開頭即說明公司對其履歷印象深刻，並邀請其參加面試（invite you to an interview），故答案為(B)。(A)信中並未直接錄用，只是邀約面試；(C)未要求補件；(D)並非取消面試而是安排面試。關鍵字：invite（邀請）、interview（面試）。",
        skill: "main_idea" },
      { q: "What is Mr. Osei asked to bring to the interview?",
        options: ["A list of professional references", "A printed copy of his portfolio", "A signed employment contract", "A laptop computer"],
        answer: 1,
        explanation_zh: "第三段明確提到 please bring a printed copy of your portfolio，故答案為(B)。信中並未提及推薦人名單、合約或筆電。關鍵字：portfolio（作品集）。",
        skill: "detail" },
      { q: "By what date should Mr. Osei contact Ms. Liu if the scheduled time is inconvenient?",
        options: ["August 27", "August 21", "September 1", "August 10"],
        answer: 1,
        explanation_zh: "第三段寫明 contact me... by August 21 so we can arrange an alternative slot，故答案為(B)。August 27 是原訂面試日期，而非聯絡截止日；其餘日期文中未提及。關鍵字：by（在……之前，截止時間）。",
        skill: "detail" },
      { q: "The word 'convenient' in paragraph 3, line 2, is closest in meaning to",
        options: ["suitable", "expensive", "distant", "confidential"],
        answer: 0,
        explanation_zh: "此處 convenient 指時間「方便、合適」，故最接近的同義字是 suitable（合適的）。expensive（昂貴的）、distant（遙遠的）、confidential（機密的）皆與原文語意無關。關鍵字：convenient（方便的）＝ suitable（合適的）。",
        skill: "vocab_in_context" }
    ] },
  { id: "p7-002", type: "single",
    passages: [ { kind: "email", title: "Email: Delayed Shipment Inquiry", text: `Subject: Order #48219 - Missing Items

Dear Customer Service,

I received Order #48219 yesterday, but the shipment was incomplete. The box contained only three of the five office chairs I ordered on July 30. The packing slip inside listed all five items as shipped, so I am not sure where the mistake occurred.

Because my office is opening to clients next Monday, I need the remaining two chairs before then. Could you please check your warehouse records and arrange an express delivery for the missing items? I would also appreciate a brief explanation of what went wrong, since this is the second time an order from your company has arrived incomplete.

I have attached photos of the box and the packing slip for your reference. Please let me know how you plan to resolve this as soon as possible.

Sincerely,
Priya Nandan
Nandan Design Studio` } ],
    questions: [
      { q: "What problem does Ms. Nandan describe in the email?",
        options: ["An order arrived with the wrong color of chairs", "An order arrived with fewer items than expected", "An order was delivered to the wrong address", "An order was billed twice"],
        answer: 1,
        explanation_zh: "信中提到訂購五張辦公椅，箱內卻只有三張（only three of the five office chairs），屬於短少問題，故答案為(B)。信中未提到顏色錯誤、送錯地址或重複扣款。關鍵字：incomplete（不完整的）。",
        skill: "detail" },
      { q: "What can be inferred about Ms. Nandan's previous experience with the company?",
        options: ["She has never ordered from the company before", "She had a similar problem with an earlier order", "She received a full refund last time", "She was very satisfied with past service"],
        answer: 1,
        explanation_zh: "信中提到 this is the second time an order from your company has arrived incomplete，暗示她先前也曾遇過同樣的缺件問題，故答案為(B)。並無證據顯示她是第一次下單、曾獲退款，或對過去服務感到滿意。關鍵字：the second time（第二次）。",
        skill: "inference" },
      { q: "According to the email, which of the following did Ms. Nandan NOT do?",
        options: ["Attach photos of the box and packing slip", "Explain when she placed the order", "Request a full refund instead of replacement items", "Ask for an explanation of the error"],
        answer: 2,
        explanation_zh: "信中要求補寄少的椅子（express delivery）並詢問出錯原因，並未要求退款，故答案為(C)為未做的事。她確實附上照片（A）、提到訂購日期 July 30（B），也要求說明原因（D），均與信件相符。關鍵字：refund（退款）、request（要求）。",
        skill: "NOT" },
      { q: "The word 'resolve' in paragraph 3, line 2, is closest in meaning to",
        options: ["settle", "ignore", "delay", "publicize"],
        answer: 0,
        explanation_zh: "此處 how you plan to resolve this 指公司打算如何「解決」這個缺件問題，與 settle（解決、處理）意思最接近。ignore（忽視）、delay（拖延）、publicize（公開宣傳）皆與原文語意不符。關鍵字：resolve（解決）＝ settle（解決）。",
        skill: "vocab_in_context" }
    ] },
  { id: "p7-003", type: "single",
    passages: [ { kind: "email", title: "Email: Team Meeting Rescheduled", text: `Dear Team,

I am writing to let you know that Thursday's marketing strategy meeting has been moved from 2:00 p.m. to 4:00 p.m. This change is necessary because the conference room on the third floor will be used for equipment installation until 3:30 p.m.

The meeting will still take place in Conference Room B, and the agenda remains the same: reviewing the Q3 campaign results and planning the product launch event for October. Please bring your department's updated budget figures, as we will finalize the numbers during the meeting.

If you are unable to attend at the new time, please reply to this email by Wednesday morning so that we can share the meeting notes with you afterward. I apologize for any inconvenience this change may cause and appreciate your flexibility.

Best,
Marcus Webb
Marketing Director` } ],
    questions: [
      { q: "Why did Marcus Webb send this email?",
        options: ["To cancel a scheduled meeting", "To announce a change in the meeting time", "To introduce a new team member", "To request feedback on a proposal"],
        answer: 1,
        explanation_zh: "信件一開始即說明會議時間更改（moved from 2:00 p.m. to 4:00 p.m.），故答案為(B)。會議並未取消，也未涉及新成員介紹或提案回饋。關鍵字：rescheduled（重新安排時間）。",
        skill: "main_idea" },
      { q: "Why was the meeting time changed?",
        options: ["The director will be out of town", "The conference room is being used for installation work", "Too few employees confirmed attendance", "The agenda needed to be revised"],
        answer: 1,
        explanation_zh: "信中說明 the conference room on the third floor will be used for equipment installation until 3:30 p.m.，因此會議需延後，故答案為(B)。信中未提到主管外出、與會人數不足或議程需修改。關鍵字：installation（安裝）。",
        skill: "detail" },
      { q: "What are employees expected to bring to the meeting?",
        options: ["A signed attendance sheet", "Their department's updated budget figures", "Samples of the new product", "A written summary of the Q3 campaign"],
        answer: 1,
        explanation_zh: "信中直接寫明 please bring your department's updated budget figures，屬於文中明確交代的細節，故答案為(B)。信中未要求簽到表、產品樣品或書面摘要。關鍵字：budget figures（預算數字）。",
        skill: "detail" },
      { q: "According to the email, which of the following is NOT mentioned about Thursday's meeting?",
        options: ["It will be held in Conference Room B", "The agenda includes planning the October product launch event", "A guest speaker from the sales department will attend", "Meeting notes will be shared with employees who cannot attend"],
        answer: 2,
        explanation_zh: "信中提到會議仍在 Conference Room B 舉行、議程包含規劃十月產品發表活動，以及無法出席者可收到會議記錄，但全文並未提及會有業務部門的來賓講者，故答案為(C)為未提及的選項。關鍵字：mentioned（提及）。",
        skill: "NOT" }
    ] },
  { id: "p7-004", type: "single",
    passages: [ { kind: "notice", title: "Notice: Building Renovation Schedule", text: `NOTICE TO ALL TENANTS

Riverside Business Center will begin renovation work on the second and third floor restrooms starting Monday, September 1. The work is expected to continue for approximately three weeks and will be carried out between 8:00 a.m. and 6:00 p.m. on weekdays only.

During this period, restrooms on the affected floors will be closed. Tenants on the second and third floors may use the restrooms on the first or fourth floor. We also ask that all employees avoid the west stairwell near the construction area, as it will be blocked for safety reasons; please use the east stairwell or the elevators instead.

Noise from drilling and other construction activity may occur throughout the day. Management apologizes for any disruption and will send daily updates by email if the schedule changes. Questions may be directed to the building office at extension 220.

Thank you for your patience and cooperation.` } ],
    questions: [
      { q: "What is the main purpose of this notice?",
        options: ["To announce a change in office hours", "To inform tenants about upcoming renovation work", "To advertise new restroom facilities", "To request feedback on building services"],
        answer: 1,
        explanation_zh: "公告開頭即說明大樓將進行洗手間整修工程（begin renovation work），並說明期間安排，故答案為(B)。並未提及辦公時間變更、新設施廣告或意見回饋。關鍵字：renovation（整修）。",
        skill: "main_idea" },
      { q: "Which stairwell should employees avoid during the renovation?",
        options: ["The east stairwell", "The west stairwell", "The main lobby stairs", "The stairwell on the first floor"],
        answer: 1,
        explanation_zh: "公告明確指出 avoid the west stairwell near the construction area，故答案為(B)。東側樓梯反而是建議改走的路線，並無提及大廳或一樓樓梯需避開。關鍵字：avoid（避開）。",
        skill: "detail" },
      { q: "According to the notice, what is NOT mentioned as a way to handle the renovation period?",
        options: ["Using restrooms on unaffected floors", "Taking the east stairwell or elevators instead", "Receiving daily email updates if the schedule changes", "Working from home during construction hours"],
        answer: 3,
        explanation_zh: "公告提到可改用其他樓層洗手間、改走東側樓梯或電梯，以及排程異動時會以電子郵件通知，但並未提及員工可在施工期間改為在家工作，故答案為(D)。關鍵字：mentioned（提及）。",
        skill: "NOT" },
      { q: "The word 'disruption' in paragraph 3, line 2, is closest in meaning to",
        options: ["disturbance", "damage", "expense", "celebration"],
        answer: 0,
        explanation_zh: "此處 disruption 指施工造成的干擾、打斷，與 disturbance（干擾）意思最接近。damage（損害）、expense（費用）、celebration（慶祝）皆不符合語境。關鍵字：disruption（干擾）＝ disturbance（干擾）。",
        skill: "vocab_in_context" }
    ] },
  { id: "p7-005", type: "single",
    passages: [ { kind: "article", title: "Article: Local Bakery Chain Expands Region-Wide", text: `Sunrise Bakery, a local favorite known for its sourdough bread and pastries, announced last week that it will open five new branches across the region by the end of next year. The company, which started as a single shop in Maple Grove twelve years ago, now operates eight locations and employs more than 150 people.

According to founder Elena Ruiz, the expansion was made possible by a recent partnership with a regional grocery distributor, which will allow Sunrise Bakery to source ingredients at lower cost while maintaining quality. 'We have always focused on fresh, simple ingredients,' Ruiz said. 'This partnership lets us grow without changing what makes our bread special.'

The new branches will be located primarily in suburban shopping centers, where the company believes demand for fresh baked goods has grown significantly in the past two years. Sunrise Bakery also plans to introduce a mobile ordering app next spring, allowing customers to place orders ahead of time and skip the line during busy morning hours.

Ruiz added that hiring for the new locations will begin in October.` } ],
    questions: [
      { q: "What is this article mainly about?",
        options: ["A bakery's plan to expand its business", "A review of a bakery's new products", "A change in bread prices at local bakeries", "A partnership between two grocery chains"],
        answer: 0,
        explanation_zh: "文章主旨是描述 Sunrise Bakery 宣布展店計畫（open five new branches），故答案為(A)。文中並非產品評論、價格變動，也不是兩家雜貨商合併的報導。關鍵字：expand（擴張）。",
        skill: "main_idea" },
      { q: "What made the expansion possible, according to Elena Ruiz?",
        options: ["A loan from a local bank", "A partnership with a grocery distributor", "A government subsidy for small businesses", "An increase in bread prices"],
        answer: 1,
        explanation_zh: "文中提到 a recent partnership with a regional grocery distributor 使公司能以更低成本取得原料，是擴張的關鍵，故答案為(B)。文中未提及銀行貸款、政府補助或漲價。關鍵字：partnership（合作關係）。",
        skill: "detail" },
      { q: "What will Sunrise Bakery most likely do in October?",
        options: ["Close its original shop in Maple Grove", "Begin hiring employees for new branches", "Launch its mobile ordering app", "Change its bread recipes"],
        answer: 1,
        explanation_zh: "文末直接寫明 hiring for the new locations will begin in October，屬於文中明確交代的細節，故答案為(B)。文中未提到關閉原始店面、十月推出app（app 預計春季推出）或改變食譜。關鍵字：hiring（招募）。",
        skill: "detail" },
      { q: "The word 'significantly' in paragraph 3, line 2, is closest in meaning to",
        options: ["substantially", "occasionally", "slightly", "temporarily"],
        answer: 0,
        explanation_zh: "此處 significantly 修飾 grown，指需求大幅、顯著成長，與 substantially（大幅地）意思最接近。occasionally（偶爾）、slightly（些微地）、temporarily（暫時地）皆與原意不符。關鍵字：significantly（顯著地）＝ substantially（大幅地）。",
        skill: "vocab_in_context" }
    ] },
  { id: "p7-006", type: "single",
    passages: [ { kind: "article", title: "Article: More Companies Offer Permanent Remote Options", text: `A growing number of companies in the region are making remote work a permanent option rather than a temporary measure, according to a survey released this month by the Regional Business Council. The survey, which included responses from over 300 local employers, found that 42 percent now allow employees to work from home at least three days a week, up from just 15 percent three years ago.

Employers cited several reasons for the shift, including lower office costs and improved employee satisfaction. However, some managers noted challenges as well, particularly in training new staff and maintaining team communication across departments.

Rachel Kim, an operations manager at a local software firm, said her company adopted a hybrid model last year and has seen positive results. 'Our turnover rate has dropped, and employees report feeling more focused during remote days,' she said. Still, Kim noted that her team holds mandatory in-person meetings twice a month to preserve collaboration.

The survey also found that smaller companies were more likely than larger ones to offer full-time remote positions.` } ],
    questions: [
      { q: "What is the survey mainly about?",
        options: ["Employee salaries across different industries", "The rise of permanent remote work arrangements", "New office building designs", "Government regulations on hybrid work"],
        answer: 1,
        explanation_zh: "文章開頭即說明調查主題為企業將遠距工作列為長期選項的趨勢（remote work a permanent option），故答案為(B)。文中未涉及薪資比較、辦公室設計或政府法規。關鍵字：permanent remote work（長期遠距工作）。",
        skill: "main_idea" },
      { q: "According to the article, what percentage of employers now allow remote work at least three days a week?",
        options: ["15 percent", "42 percent", "300 percent", "3 percent"],
        answer: 1,
        explanation_zh: "文中明確指出 42 percent now allow employees to work from home at least three days a week，故答案為(B)。15 percent 是三年前的比例，300 是受訪雇主數量，並非百分比。關鍵字：42 percent（百分之四十二）。",
        skill: "detail" },
      { q: "Which of the following is NOT mentioned as a reason for offering remote work?",
        options: ["Lower office costs", "Improved employee satisfaction", "Higher government tax credits", "Reduced employee turnover"],
        answer: 2,
        explanation_zh: "文中提到降低辦公室成本、提升員工滿意度，以及 Kim 提到離職率下降，但並未提及政府稅務優惠，故答案為(C)。關鍵字：tax credits（稅務優惠，文中未提及）。",
        skill: "NOT" },
      { q: "The word 'preserve' in paragraph 3, line 4, is closest in meaning to",
        options: ["maintain", "eliminate", "reduce", "ignore"],
        answer: 0,
        explanation_zh: "此處 to preserve collaboration 指舉行實體會議是為了「維持」團隊合作，與 maintain（維持）意思最接近。eliminate（消除）、reduce（減少）、ignore（忽視）皆與原文語意相反或不符。關鍵字：preserve（維持）＝ maintain（維持）。",
        skill: "vocab_in_context" }
    ] }
]);
window.TOEIC_DATA.p7 = (window.TOEIC_DATA.p7 || []).concat([
  { id: "p7-007", type: "single",
    passages: [ { kind: "ad", title: "Advertisement: Warehouse Supervisor Position", text: `NOW HIRING: Warehouse Supervisor
Coastal Distribution Inc.

Coastal Distribution Inc. is seeking an experienced Warehouse Supervisor to oversee daily operations at our Riverside facility. The ideal candidate will manage a team of 15 warehouse staff, coordinate inbound and outbound shipments, and ensure inventory accuracy across all storage areas.

Requirements:
- At least three years of warehouse or logistics experience
- Familiarity with inventory management software
- Strong leadership and communication skills
- Ability to work occasional weekend shifts during peak seasons

We offer a competitive salary starting at $52,000 per year, health insurance, and paid time off after six months of employment. Employees who complete one year of service are also eligible for a performance bonus.

To apply, send your resume and a brief cover letter to careers@coastaldist.com by September 5. Only candidates selected for an interview will be contacted. No phone calls, please.` } ],
    questions: [
      { q: "What is the purpose of this advertisement?",
        options: ["To announce a company merger", "To recruit a warehouse supervisor", "To promote a new shipping service", "To describe warehouse safety procedures"],
        answer: 1,
        explanation_zh: "廣告標題與內容皆在徵求倉庫主管人選（seeking an experienced Warehouse Supervisor），故答案為(B)。廣告與併購、運輸服務推廣或安全規範說明無關。關鍵字：hiring（招募）。",
        skill: "main_idea" },
      { q: "What is one of the listed job requirements?",
        options: ["A university degree in business", "At least three years of relevant experience", "Fluency in a second language", "A valid driver's license"],
        answer: 1,
        explanation_zh: "職缺條件明列 at least three years of warehouse or logistics experience，故答案為(B)。廣告中未要求大學學歷、外語能力或駕照。關鍵字：experience（經驗）。",
        skill: "detail" },
      { q: "When are employees eligible to receive paid time off?",
        options: ["Immediately after being hired", "After completing six months of employment", "After completing one year of employment", "Only during peak season"],
        answer: 1,
        explanation_zh: "廣告提到 paid time off after six months of employment，故答案為(B)。滿一年後可領的是績效獎金（performance bonus），並非有薪假，選項(C)為誘答。關鍵字：paid time off（有薪休假）。",
        skill: "detail" },
      { q: "What can be inferred about how Coastal Distribution Inc. prefers to be contacted by applicants?",
        options: ["By phone call only", "By visiting the facility in person", "By email with a resume and cover letter", "Through a staffing agency"],
        answer: 2,
        explanation_zh: "廣告要求 send your resume and a brief cover letter to careers@coastaldist.com，並特別註明 no phone calls，可推知公司偏好以電子郵件應徵，故答案為(C)。關鍵字：no phone calls（請勿來電）。",
        skill: "inference" }
    ] },
  { id: "p7-008", type: "single",
    passages: [ { kind: "ad", title: "Advertisement: ErgoFit Office Furniture Sale", text: `ErgoFit Office Furniture - End-of-Summer Sale

Upgrade your workspace before fall! From August 20 through September 10, ErgoFit is offering 25% off all ergonomic office chairs and 15% off standing desks storewide. Our best-selling ProFlex Chair, known for its adjustable lumbar support and breathable mesh back, is now available for just $187, down from $249.

All furniture purchases over $300 include free delivery and assembly within a 20-mile radius of our downtown showroom. Need help choosing the right chair? Our staff offer free 15-minute consultations to help match your setup to your budget and posture needs.

Members of our Rewards Program earn double points during the sale and can redeem points toward future purchases. Not a member yet? Sign up in-store or online to receive an additional 5% off your first order.

Visit us at 214 Commerce Street or shop online at ergofitfurniture.com. Sale ends September 10 - while supplies last.` } ],
    questions: [
      { q: "What is being advertised?",
        options: ["A grand opening event for a new store", "A limited-time sale on office furniture", "A furniture repair service", "A job fair for retail positions"],
        answer: 1,
        explanation_zh: "廣告主要宣傳限時特賣活動（End-of-Summer Sale），販售辦公椅與升降桌等家具，故答案為(B)。並非開幕活動、維修服務或徵才活動。關鍵字：sale（特賣）。",
        skill: "main_idea" },
      { q: "What is the sale price of the ProFlex Chair?",
        options: ["$249", "$187", "$300", "$15"],
        answer: 1,
        explanation_zh: "廣告寫明 ProFlex Chair... now available for just $187，故答案為(B)。$249 是原價，$300 是免運門檻，$15 為諮詢時間（分鐘）而非價格。關鍵字：$187（特價）。",
        skill: "detail" },
      { q: "The word 'redeem' in paragraph 3, line 1, is closest in meaning to",
        options: ["exchange", "discard", "postpone", "calculate"],
        answer: 0,
        explanation_zh: "此處 redeem points 指兌換點數換取優惠，與 exchange（兌換）意思最接近。discard（丟棄）、postpone（延後）、calculate（計算）皆不符語境。關鍵字：redeem（兌換）＝ exchange（兌換）。",
        skill: "vocab_in_context" },
      { q: "According to the advertisement, which of the following is NOT offered during the sale?",
        options: ["Free delivery and assembly for purchases over $300", "Double Rewards Program points", "An extended two-year warranty on all furniture", "An additional 5% off for new Rewards Program members"],
        answer: 2,
        explanation_zh: "廣告提到消費滿 $300 享免運與組裝、會員雙倍點數，以及新會員加碼 5% 折扣，但全文並未提及任何延長保固方案，故答案為(C)為未提及的選項。關鍵字：offered（提供）。",
        skill: "NOT" }
    ] },
  { id: "p7-009", type: "single",
    passages: [ { kind: "form", title: "Form: Regional Marketing Conference Registration", text: `Regional Marketing Conference 2026
Registration Form

Event Dates: October 14-15, 2026
Location: Grandview Convention Center, Hall B

Registration Fee:
- Early Bird (before September 1): $150
- Standard (September 1-October 1): $195
- On-site registration: $230

Fee includes: access to all sessions, printed program, lunch on both days, and a certificate of attendance. Workshop materials are not included and may be purchased separately for $20 per workshop.

Cancellation Policy: Cancellations received before September 20 will receive a full refund minus a $25 processing fee. No refunds will be issued for cancellations made after September 20, though registration may be transferred to another attendee at no charge.

Please note: registration does not include hotel accommodation. A list of partner hotels offering discounted rates is available on our website.

For questions, contact registration@regionalmktgconf.org.` } ],
    questions: [
      { q: "How much does early bird registration cost?",
        options: ["$195", "$230", "$150", "$25"],
        answer: 2,
        explanation_zh: "表單列出 Early Bird (before September 1): $150，故答案為(C)。$195 為標準價、$230 為現場報名價、$25 為取消手續費。關鍵字：Early Bird（早鳥優惠）。",
        skill: "detail" },
      { q: "What is included in the registration fee?",
        options: ["Hotel accommodation for two nights", "Workshop materials for all sessions", "Lunch on both days of the conference", "Transportation to the convention center"],
        answer: 2,
        explanation_zh: "表單明確說明 Fee includes... lunch on both days，故答案為(C)。飯店住宿明確排除在外（說明中提及不包含），工作坊材料需另購，交通亦未提及。關鍵字：includes（包含）。",
        skill: "detail" },
      { q: "What will most likely happen if a registrant cancels on October 5?",
        options: ["They will receive a full refund", "They will receive a refund minus $25", "They will receive no refund but may transfer their registration", "They will be charged an additional $230"],
        answer: 2,
        explanation_zh: "取消政策說明 9 月 20 日之後取消將不予退費，但可無償轉讓給其他參加者，10 月 5 日已超過 9 月 20 日的期限，故答案為(C)。全額退費或扣 $25 退費僅適用於 9 月 20 日前取消。關鍵字：transferred（轉讓）。",
        skill: "inference" },
      { q: "The word 'transferred' in the cancellation policy section is closest in meaning to",
        options: ["reassigned", "canceled", "duplicated", "discounted"],
        answer: 0,
        explanation_zh: "此處 registration may be transferred to another attendee 指報名資格可「轉讓」給另一位參加者，與 reassigned（轉交、改分配給他人）意思最接近。canceled（取消）、duplicated（複製）、discounted（打折）皆與原文語意不符。關鍵字：transferred（轉讓）＝ reassigned（轉交）。",
        skill: "vocab_in_context" }
    ] },
  { id: "p7-010", type: "single",
    passages: [ { kind: "chat", title: "Online Chat: Finalizing the Client Presentation", text: `Grace Lin (9:14 a.m.): Hey, are the slides for tomorrow's client presentation ready yet?
Tom Reyes (9:16 a.m.): Almost. I finished the sales data section, but I still need the updated chart from Priya.
Grace Lin (9:17 a.m.): I saw Priya is out sick today. Do we have the raw numbers to build it ourselves?
Tom Reyes (9:19 a.m.): I think so. She emailed the spreadsheet last Friday, so the data should already be there.
Grace Lin (9:20 a.m.): Great, can you build the chart, or should I?
Tom Reyes (9:22 a.m.): I can do it, but I won't finish until around 3 p.m. because I have a call at 1.
Grace Lin (9:23 a.m.): That works. The client meeting isn't until 10 a.m. tomorrow, so we have time.
Tom Reyes (9:24 a.m.): Sounds good. I'll also double-check the numbers against last quarter's report before I send it over.
Grace Lin (9:25 a.m.): Perfect. Send it to me once it's done so I can review it tonight.
Tom Reyes (9:26 a.m.): Will do. Thanks for checking in.` } ],
    questions: [
      { q: "What does Tom Reyes mean when he writes, 'I think so'?",
        options: ["He is not sure whether Priya sent the spreadsheet", "He believes the data needed for the chart is available", "He doubts the client meeting will happen", "He is unsure whether Grace saw his message"],
        answer: 1,
        explanation_zh: "Grace 詢問是否有原始數據可自行製作圖表，Tom 回答 I think so 表示他認為資料應該已在（她上週寄的試算表裡），意即他相信製圖所需數據是齊全的，故答案為(B)。並非對信件寄送與否不確定，也與會議是否舉行或訊息是否被看到無關。關鍵字：I think so（我認為如此，表示肯定推測）。",
        skill: "inference" },
      { q: "Why is Priya not working on the presentation today?",
        options: ["She is on a business trip", "She is out sick", "She has been reassigned to another project", "She already finished her part"],
        answer: 1,
        explanation_zh: "Grace 提到 I saw Priya is out sick today，說明 Priya 今天請病假，故答案為(B)。對話中未提及出差、調職或已完成工作。關鍵字：out sick（請病假）。",
        skill: "detail" },
      { q: "What will Tom do before sending the chart to Grace?",
        options: ["Ask Priya to review it", "Compare the numbers with last quarter's report", "Print a copy for the client meeting", "Schedule a call with the client"],
        answer: 1,
        explanation_zh: "Tom 表示 I'll also double-check the numbers against last quarter's report before I send it over，故答案為(B)。他並未提到請 Priya 審核、列印給客戶或與客戶約電話。關鍵字：double-check（再次確認）。",
        skill: "detail" },
      { q: "What time is the client presentation scheduled for?",
        options: ["1:00 p.m. today", "3:00 p.m. today", "10:00 a.m. tomorrow", "9:00 a.m. tomorrow"],
        answer: 2,
        explanation_zh: "Grace 直接提到 the client meeting isn't until 10 a.m. tomorrow，屬於對話中明確交代的細節，故答案為(C)。下午 1 點是 Tom 的通話時間、下午 3 點是他預計完成圖表的時間，皆非會議時間。關鍵字：tomorrow（明天）。",
        skill: "detail" }
    ] },
  { id: "p7-011", type: "single",
    passages: [ { kind: "chat", title: "Online Chat: Product Return Support", text: `Ben Foster (2:03 p.m.): Hi, I ordered a desk lamp last week and it arrived with a cracked base. Can I get a replacement?
Support - Nia (2:04 p.m.): I'm sorry to hear that! Could you provide your order number so I can look into it?
Ben Foster (2:05 p.m.): Sure, it's #77341.
Support - Nia (2:07 p.m.): Thanks, I see your order. Since the item arrived damaged, we can send a free replacement or issue a full refund. Which would you prefer?
Ben Foster (2:08 p.m.): I'd like the replacement, if it can arrive before next Friday.
Support - Nia (2:10 p.m.): It should arrive within 3-4 business days, so that works. I'll also send you a prepaid shipping label to return the damaged lamp.
Ben Foster (2:11 p.m.): Do I need to send it back before the new one ships?
Support - Nia (2:12 p.m.): No, the replacement will ship today regardless. You'll have 14 days to return the damaged item using the label.
Ben Foster (2:13 p.m.): Great, that's fine. Thank you for the quick help!
Support - Nia (2:14 p.m.): You're welcome! You'll receive a confirmation email shortly.` } ],
    questions: [
      { q: "What does Nia mean when she writes, 'that works'?",
        options: ["The replacement lamp is currently out of stock", "The estimated delivery time meets Ben's deadline", "The refund has already been processed", "The shipping label cannot be printed"],
        answer: 1,
        explanation_zh: "Ben 希望換貨在下週五前送達，Nia 說明約 3-4 個工作天送達後回覆 that works，表示這個時間符合 Ben 的期限，故答案為(B)。並非缺貨、退款已完成或無法列印標籤。關鍵字：that works（這樣可行）。",
        skill: "inference" },
      { q: "What does Ben Foster report is wrong with his order?",
        options: ["The wrong item was delivered", "The lamp's base was cracked", "The package never arrived", "The lamp was the wrong color"],
        answer: 1,
        explanation_zh: "Ben 一開始就說明 it arrived with a cracked base，故答案為(B)。並非送錯商品、包裹未送達或顏色錯誤。關鍵字：cracked base（底座裂開）。",
        skill: "detail" },
      { q: "What must Ben do within 14 days?",
        options: ["Pay for the replacement lamp", "Provide his order number", "Return the damaged lamp using the prepaid label", "Confirm his shipping address"],
        answer: 2,
        explanation_zh: "Nia 直接說明 You'll have 14 days to return the damaged item using the label，屬於對話中明確交代的細節，故答案為(C)。訂單號碼已於稍早提供、無需為換貨付費，也未提及確認地址。關鍵字：14 days（十四天）。",
        skill: "detail" },
      { q: "According to the chat, which of the following did Nia NOT offer to Ben?",
        options: ["A free replacement lamp", "A full refund as an alternative option", "A prepaid shipping label for the return", "A discount coupon for a future purchase"],
        answer: 3,
        explanation_zh: "對話中 Nia 提供免費換新燈具或全額退款兩種選擇，並會寄送已付郵資的退貨標籤，但全程並未提及任何未來消費折價券，故答案為(D)為未提供的項目。關鍵字：offer（提供）。",
        skill: "NOT" }
    ] },
  { id: "p7-012", type: "single",
    passages: [ { kind: "memo", title: "Memo: Updated Expense Reimbursement Policy", text: `TO: All Staff
FROM: Finance Department
DATE: August 10, 2026
RE: Updated Expense Reimbursement Policy

Effective September 1, the company is updating its expense reimbursement policy to simplify the submission process. All reimbursement requests must now be submitted through the new online portal, ExpenseTrack, rather than by paper form.

Employees should submit requests within 30 days of the expense date, along with a digital copy of the receipt. Requests submitted after 30 days may be denied unless approved in advance by a department manager. Reimbursements for approved requests will be processed within 10 business days and deposited directly into employees' payroll accounts.

Please note that the maximum reimbursable amount for meals during business travel remains $45 per day, and receipts are required for any single expense over $25. Expenses without receipts will not be reimbursed except in rare cases approved by a manager.

Training sessions on how to use ExpenseTrack will be held during the last week of August. Please watch for a calendar invitation from your supervisor.

Questions can be directed to finance@company.com.` } ],
    questions: [
      { q: "What is the main purpose of this memo?",
        options: ["To announce a new employee benefits package", "To explain updates to the expense reimbursement process", "To request feedback on travel policies", "To announce a change in payroll dates"],
        answer: 1,
        explanation_zh: "備忘錄主旨在說明費用報銷流程的更新（updating its expense reimbursement policy），故答案為(B)。並非新的員工福利方案、意見調查或發薪日變更。關鍵字：reimbursement policy（報銷政策）。",
        skill: "main_idea" },
      { q: "Within how many days must employees submit reimbursement requests?",
        options: ["10 days", "25 days", "30 days", "45 days"],
        answer: 2,
        explanation_zh: "備忘錄明確說明 submit requests within 30 days of the expense date，故答案為(C)。10 天是核准後撥款所需天數，25 美元是需附收據的單筆金額門檻，45 美元是每日餐費上限，皆非申請期限。關鍵字：within 30 days（三十天內）。",
        skill: "detail" },
      { q: "According to the memo, which of the following is NOT true about the new policy?",
        options: ["Requests must be submitted through an online portal", "Receipts are required for expenses over $25", "Reimbursements will be mailed as paper checks", "Training sessions will be held in late August"],
        answer: 2,
        explanation_zh: "備忘錄提到核准後款項會直接存入員工的薪資帳戶（deposited directly into employees' payroll accounts），並非以紙本支票郵寄，故答案為(C)為不符事實的敘述。其餘三項皆與備忘錄內容相符。關鍵字：deposited directly（直接存入）。",
        skill: "NOT" },
      { q: "The word 'denied' in paragraph 2, line 2, is closest in meaning to",
        options: ["rejected", "delayed", "duplicated", "forwarded"],
        answer: 0,
        explanation_zh: "此處 may be denied 指逾期申請的報銷案可能被「駁回」，與 rejected（拒絕、駁回）意思最接近。delayed（延遲）、duplicated（重複）、forwarded（轉發）皆與原文語意不符。關鍵字：denied（駁回）＝ rejected（拒絕）。",
        skill: "vocab_in_context" }
    ] }
]);
window.TOEIC_DATA.p7 = (window.TOEIC_DATA.p7 || []).concat([
  { id: "p7-021", type: "single",
    passages: [ { kind: "letter", title: "Letter: HVAC Maintenance Contract Renewal", text: `Dear Mr. Alvarez,

Your annual maintenance contract with Pinnacle HVAC Services (Contract #HV-2291) is set to expire on September 30. We would like to offer you the opportunity to renew for another twelve months at our current rate before the scheduled 8 percent price increase takes effect on October 1.

If you renew before September 15, you will lock in this year's rate of $840 for the full contract period, which includes two scheduled inspections and unlimited emergency service calls with no additional labor charge. Renewals received after September 15 will be billed at the new rate of $907.

Please note that our technicians will need access to your rooftop unit during the September inspection, currently scheduled for September 22 between 9:00 a.m. and 12:00 p.m. If this time is not convenient, contact our office at least five business days in advance to reschedule.

To renew, simply sign and return the enclosed form, or call us at 555-6740.

Sincerely,
Diane Okafor
Pinnacle HVAC Services` } ],
    questions: [
      { q: "What is the main purpose of this letter?",
        options: ["To cancel Mr. Alvarez's maintenance contract", "To offer Mr. Alvarez the chance to renew his contract before a price increase", "To notify Mr. Alvarez of a billing error", "To advertise a new line of HVAC equipment"],
        answer: 1,
        explanation_zh: "信件開頭即說明合約即將到期，並邀請 Mr. Alvarez 在漲價生效前續約（renew... before the scheduled 8 percent price increase），故答案為(B)。信中並非取消合約、帳單錯誤通知，也非設備廣告。關鍵字：renew（續約）。",
        skill: "main_idea" },
      { q: "What is included in the contract if Mr. Alvarez renews before September 15?",
        options: ["Free replacement of the rooftop unit", "Two scheduled inspections and unlimited emergency service calls with no extra labor fee", "A discount on next year's renewal", "A dedicated technician available 24 hours a day"],
        answer: 1,
        explanation_zh: "信中說明 9 月 15 日前續約可鎖定今年費率，內容包含 two scheduled inspections and unlimited emergency service calls with no additional labor charge，故答案為(B)。信中未提及免費更換屋頂機組、次年折扣或全天候專屬技師。關鍵字：includes（包含）。",
        skill: "detail" },
      { q: "What will happen if Mr. Alvarez renews his contract after September 15?",
        options: ["He will be billed at the new rate of $907", "His contract will be automatically canceled", "He will lose access to emergency service calls", "He will need to sign a three-year contract instead"],
        answer: 0,
        explanation_zh: "信中明確說明 renewals received after September 15 will be billed at the new rate of $907，故答案為(A)。信中並未提到自動取消合約、失去緊急服務資格，或須改簽三年合約。關鍵字：new rate（新費率）。",
        skill: "detail" },
      { q: "The word 'enclosed' in paragraph 4, line 1, is closest in meaning to",
        options: ["attached", "canceled", "expired", "delayed"],
        answer: 0,
        explanation_zh: "此處 the enclosed form 指信件內隨附的表格，與 attached（附上的）意思最接近。canceled（取消的）、expired（過期的）、delayed（延遲的）皆與原文語意不符。關鍵字：enclosed（隨附的）＝ attached（附上的）。",
        skill: "vocab_in_context" }
    ] }
]);
