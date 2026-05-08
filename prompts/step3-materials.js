/**
 * Step 3: Supporting Materials Generator
 * Purpose: Creates authentic, A2-B1 level reference materials with information gaps
 * Input: 
 *   - taskOverview (from Step 1, including taskScenario with aiInfo)
 *   - materialType (e.g., "menu", "schedule", "map")
 *   - studentInfoHints (optional, student's constraints to address)
 * Output: JSON with supportingMaterialsText (preserves information gap)
 * Used by: teacher.html 3단계 "AI로 텍스트 자료 생성" 버튼
 * 
 * CRITICAL: Materials must NOT reveal aiInfo secrets—students discover through dialogue
 */

export const systemPrompt = `You are an authentic materials designer for TBLT-based EFL instruction. You create realistic reference materials (menus, schedules, forms, etc.) that A2-B1 students would encounter in real-world situations.

Your specialty: Designing materials that maintain information gaps—providing enough context for students to start conversations, but requiring them to ask questions to complete tasks.

🌍 CRITICAL LANGUAGE REQUIREMENT:
ALL materials MUST be written in ENGLISH ONLY, regardless of the input language.
- Even if the task overview is in Korean, Chinese, or any other language
- Even if keywords are in non-English languages
- The output supportingMaterialsText must be 100% English
- Use simple, natural English that A2-B1 learners can understand

CRITICAL RULES:
- Output ONLY valid JSON (no markdown, no code blocks, no explanations)
- All text in simple English (A2-B1 vocabulary, short sentences)
- NEVER include "AI secret information" in the materials
- Create natural information gaps that drive authentic communication`;

// 다양한 자료 유형별 예시 템플릿
const MATERIAL_EXAMPLES = {
    menu: `"PIZZA PALACE MENU\n\nAPPETIZERS\n- Garlic Bread: $4.50\n- Caesar Salad: $6.00\n- Mozzarella Sticks: $5.50\n\nMAIN COURSES\n- Margherita Pizza (vegetarian): $12.00\n- Pepperoni Pizza: $14.00\n- Hawaiian Pizza: $15.00\n- Chicken Alfredo Pasta: $13.00\n- Spaghetti Carbonara: $12.50\n\nBEVERAGES\n- Soft Drinks: $2.50\n- Fresh Orange Juice: $3.50\n- Coffee: $2.00\n- Tea: $2.00\n\nDESSERTS\n- Tiramisu: $5.00\n- Chocolate Cake: $4.50\n- Ice Cream: $3.00"`,
    
    map: `"CAMPUS MAP - FROM LIBRARY TO CAFETERIA\n\nStart: Main Library (Building A)\n→ Exit through main entrance\n→ Walk straight 100m past the fountain\n→ Turn left at Student Center (Building C)\n→ Cafeteria is 50m ahead on your right (Building D)\nTotal walking time: ~5 minutes\n\nLandmarks:\n- Fountain (center of campus)\n- Student Center (Building C)\n- Parking Lot (behind Building D)"`,
    
    availability: `"STUDY ROOM AVAILABILITY - WEEK OF DEC 15\n\nRoom A (Seats 6, Whiteboard, Projector)\nMon: 2-5 PM, 7-9 PM available\nTue: 10 AM-12 PM, 3-6 PM available\nWed: Fully booked\nThu: 1-4 PM, 6-8 PM available\nFri: 9 AM-12 PM, 2-5 PM available\n\nRoom B (Seats 4, Whiteboard only)\nMon-Fri: 9 AM-9 PM available\n\nBooking: 24 hours in advance, max 2 hours per session\nContact: (555) 200-3000"`,
    
    catalog: `"LAPTOP SALE - TECH STORE\n\nBudget Series\n- ModelX Basic: $599 (8GB RAM, 256GB SSD) - In stock\n- ModelX Plus: $799 (16GB RAM, 512GB SSD) - 3 left\n\nPremium Series\n- ModelY Pro: $1,299 (16GB RAM, 1TB SSD, Dedicated GPU) - Order only, 5-7 days\n- ModelY Ultra: $1,899 (32GB RAM, 2TB SSD, Premium GPU) - Special order, 10-14 days\n\nAll models: 1-year warranty, 30-day return policy\nAsk about available discounts and promotions"`,
    
    transportation: `"BUS ROUTE 45 - TO CITY CENTER\n\nDeparture from Campus (Stop A)\nWeekdays: Every 15 min (6 AM - 10 PM)\nWeekends: Every 30 min (8 AM - 8 PM)\n\nKey Stops:\nStop B: Shopping Mall (10 min)\nStop C: Train Station (25 min)\nStop D: City Center (35 min)\n\nFare: $2.50 (exact change) / $2.00 (student card)\nLast bus: 10:30 PM weekdays, 8:30 PM weekends"`,
    
    announcement: `"FITNESS CENTER - TEMPORARY SCHEDULE CHANGE\n\nDue to maintenance: Pool closed Dec 20-22\n\nAlternative options during closure:\n- All pool classes moved to Gym Studio B\n- Water Aerobics → Land Aerobics (same times)\n- Swimming → Yoga/Pilates classes (ask about pricing)\n\nRegular schedule resumes Dec 23\nQuestions? Call (555) 100-2000"`,
    
    schedule: `"FITNESS CENTER CLASS SCHEDULE\n\nWEEKEND CLASSES (Saturday & Sunday)\n- 9:00 AM: Low-Impact Yoga (45 min) - $12\n- 10:30 AM: Water Aerobics (45 min) - $12\n- 2:00 PM: Gentle Pilates (60 min) - $15\n- 4:00 PM: Swimming for Beginners (45 min) - $12\n\nWEEKDAY MORNING CLASSES (Before 10 AM)\n- 8:00 AM: Morning Stretch (30 min) - $10\n- 9:00 AM: Low-Impact Yoga (45 min) - $12\n- 9:30 AM: Water Aerobics (45 min) - $12\n\nEVENING CLASSES\n- 6:00 PM: High-Intensity Zumba (60 min) - $15\n  Note: High-impact class, not suitable for knee problems\n- 7:30 PM: Yoga Basics (45 min) - $12\n\nREGISTRATION INFORMATION\n- Registration Desk: Main lobby, open 7 AM - 8 PM daily\n- Registration Deadline: 24 hours before class\n- Contact: (555) 123-4567 or email: classes@fitnesscenter.com\n- Payment: Cash, card, or monthly membership\n\nFor special offers and discounts, please ask at the registration desk."`,
    
    form: `"LOST BAGGAGE REPORT FORM\n\nPassenger Information:\nName: _____________________\nFlight Number: _____________\nDate of Travel: _____________\n\nBaggage Description:\nColor: _____________________\nSize: _____________________\nBrand: _____________________\nSpecial Features: _____________\n\nContents (please list important items):\n1. _____________________\n2. _____________________\n3. _____________________\n\nContact Information:\nPhone: _____________________\nEmail: _____________________\nAddress: _____________________\n\nReference Number: _____________\n\nPlease keep this form for your records."`,
    
    booking: `"HOTEL ROOM AVAILABILITY - DECEMBER 15-20\n\nStandard Room (1-2 guests)\n- Dec 15-17: Available - $89/night\n- Dec 18-20: Available - $95/night\n- Includes: Free WiFi, Continental breakfast\n\nDeluxe Room (1-3 guests)\n- Dec 15-16: Available - $129/night\n- Dec 17-20: Fully booked\n- Includes: Free WiFi, Full breakfast, Mini-fridge\n\nSuite (1-4 guests)\n- Dec 15-20: Available - $199/night\n- Includes: Free WiFi, Room service, Balcony\n\nBooking: Call (555) 400-5000 or online\nCancellation: Free until 24 hours before check-in"`,
    
    movie: `"CINEMA SHOWTIMES - THIS WEEK\n\nAction Movie 'Thunder Strike'\n- Today: 2:00 PM, 5:30 PM, 8:45 PM\n- Tomorrow: 1:30 PM, 4:45 PM, 7:30 PM, 10:00 PM\n- Weekend: 12:00 PM, 3:15 PM, 6:30 PM, 9:45 PM\n\nComedy 'Laugh Out Loud'\n- Today: 3:30 PM, 6:45 PM\n- Tomorrow: 2:15 PM, 5:30 PM, 8:15 PM\n- Weekend: 1:00 PM, 4:15 PM, 7:30 PM, 10:15 PM\n\nDrama 'Heart Strings'\n- Today: 4:00 PM, 7:15 PM\n- Tomorrow: 3:00 PM, 6:15 PM, 9:30 PM\n- Weekend: 2:00 PM, 5:15 PM, 8:30 PM\n\nTickets: $12 adults, $8 students, $6 children\nOnline booking: www.cinema.com"`,
    
    medical: `"DOCTOR'S OFFICE - APPOINTMENT SCHEDULE\n\nDr. Smith (General Practice)\n- Monday: 9 AM - 5 PM (lunch 12-1 PM)\n- Tuesday: 8 AM - 4 PM (lunch 12-1 PM)\n- Wednesday: 10 AM - 6 PM (lunch 1-2 PM)\n- Thursday: 9 AM - 5 PM (lunch 12-1 PM)\n- Friday: 8 AM - 3 PM\n\nDr. Johnson (Specialist)\n- Tuesday: 2 PM - 6 PM\n- Thursday: 9 AM - 1 PM\n- Friday: 10 AM - 4 PM\n\nAppointment Types:\n- Regular check-up: 30 minutes\n- Consultation: 45 minutes\n- Follow-up: 15 minutes\n\nBooking: Call (555) 600-7000\nWalk-ins: Limited availability, first come first served"`
};

export function generatePrompt(taskOverview, materialType, studentInfoHints = []) {
    // 🆕 역할 유형 감지
    const studentRole = taskOverview.studentRoleSimple?.toLowerCase() || '';
    const aiRole = taskOverview.aiRoleSimple?.toLowerCase() || '';
    
    // Peer roles: 대등한 관계 (친구, 동료, 룸메이트 등)
    const peerRoles = ['friend', 'classmate', 'roommate', 'colleague', 'partner', 'teammate'];
    const isPeerContext = peerRoles.includes(studentRole) && peerRoles.includes(aiRole);
    
    // Service roles: 서비스 제공자-고객 관계
    const isServiceContext = !isPeerContext;
    
    return `
🌍 CRITICAL: OUTPUT LANGUAGE MUST BE ENGLISH
Regardless of the language used in the task overview below, you MUST generate the supportingMaterialsText in ENGLISH ONLY.

📋 CONTEXT TYPE: ${isPeerContext ? 'PEER-TO-PEER' : 'SERVICE-BASED'}

${isPeerContext ? `
⚠️ PEER CONTEXT DETECTED:
You are creating materials for a peer-to-peer interaction (${studentRole} talking to ${aiRole}).

📋 MATERIAL TYPES IN PEER CONTEXTS:

**Type A: AI's Personal Information**
(Use when materialType suggests personal info like "my schedule", "my preferences", "my availability")

What to include:
✅ AI role's schedule (when AI is free/busy)
✅ AI role's preferences (what AI likes/wants to do)
✅ AI role's budget/constraints
✅ AI role's resources

What NOT to include:
❌ Student's personal schedule
❌ Student's budget constraints
❌ Student's preferences

Example: "MY WEEKLY SCHEDULE"
\`\`\`
SATURDAY
- Morning: Family brunch
- Afternoon: Free after 2 PM
SUNDAY
- Morning: Usually available
- Afternoon: Yoga class at 3 PM
\`\`\`

**Type B: Shared Reference Information**
(Use when materialType suggests neutral info like "list of activities", "restaurant options", "movie showtimes")

What to include:
✅ Neutral factual information both can reference
✅ Prices, times, locations, descriptions
✅ Options that address BOTH student AND AI constraints
✅ Enough variety for negotiation

What NOT to include:
❌ "Your budget is $25" ← Student's constraint stated explicitly
❌ "You prefer quiet activities" ← Student's preference stated explicitly

Example: "WEEKEND ACTIVITIES LIST"
\`\`\`
CULTURAL ACTIVITIES
- Science Museum: $15 entry, open until 8 PM, 2-3 hours
- Art Gallery: Free entry, open until 9 PM, 1-2 hours (quiet)

DINING
- Italian Bistro: $20-30 per person, open until 10 PM
- Food Court: $10-15 per person, open until 11 PM

ENTERTAINMENT
- Movie Theater: $12 ticket, showtimes 5 PM, 7 PM, 9 PM (quiet)
- Live Music Venue: $25 cover, shows 8 PM-11 PM (loud)
\`\`\`

🎯 **KEY DISTINCTION:**

❌ DON'T write: "Since your budget is $25..." (stating student's constraint)
✅ DO write: "Movie tickets: $12" (neutral fact the student can evaluate)

❌ DON'T write: "You prefer quiet activities, so..." (stating student's preference)
✅ DO write: "Movie theater (quiet atmosphere)" (neutral description)

The student will APPLY their constraints themselves by choosing relevant options.

📊 **CONSTRAINT MATCHING IN PEER CONTEXTS:**

Even though you don't STATE the student's constraints, you must still PROVIDE OPTIONS that match them.

` : `
⚠️ SERVICE CONTEXT DETECTED:
You are creating materials for a service interaction (${studentRole} talking to ${aiRole}).

In this context:
- The materials should represent NEUTRAL public information
- Examples: Menu, class schedule, price list, availability, map
- This is information that BOTH the student and AI can reference
- Materials should address the student's constraints by including relevant options

WHAT TO INCLUDE IN MATERIALS:
✅ Public information (menus, schedules, prices)
✅ Options that match student's constraints
✅ Options that nearly match (create negotiation opportunities)
✅ Clear labels for important attributes (times, prices, requirements)

`}

Generate authentic supporting materials (${materialType}) that provide context for the task while maintaining an information gap that requires the student to communicate with the AI tutor.

TASK OVERVIEW:
${JSON.stringify(taskOverview, null, 2)}

⚠️ LANGUAGE REMINDER:
- The task overview above may contain Korean, Chinese, or other languages
- You must TRANSLATE the relevant information into simple English (A2-B1 level)
- All names, places, items, prices, times in the materials must be in ENGLISH
- Use natural English that EFL learners would encounter in real situations

MATERIAL TYPE REQUESTED: ${materialType}

${taskOverview.taskScenario?.studentInfo?.length > 0 ? `
${isServiceContext ? `
STUDENT'S CONSTRAINTS (materials should address these):
${taskOverview.taskScenario.studentInfo.map((item, i) => `  ${i+1}. ${item}`).join('\n')}

### **CRITICAL: CONSTRAINT MATCHING REQUIREMENTS**

You MUST create materials that directly address EACH student constraint. 
For EVERY item in studentInfo, ensure the materials include relevant options.

**Matching Rules:**

1. **Time Constraints** (e.g., "Available only on weekends", "Prefer afternoon after 2 PM"):
   ✅ REQUIRED: Include schedule showing time slots that match this constraint
   ✅ REQUIRED: Include at least 2-3 options within the time range
   
   Example: If student needs "weekends after 2 PM":
   - Section A MUST show: "Saturday 2:00 PM: [Class]", "Sunday 4:00 PM: [Class]"
   - Do NOT only show morning classes (9 AM, 11 AM)

2. **Budget Constraints** (e.g., "Budget ≤ $15", "Maximum ₩20,000 per class"):
   ✅ REQUIRED: Include at least 2-3 options within or at the budget limit
   ✅ OPTIONAL: Include 1-2 near-miss options ($1-3 over budget for negotiation)
   
   Example: If student budget is ₩20,000:
   - Section A MUST show: "Yoga - ₩18,000", "Pilates - ₩20,000"
   - MAY show: "Premium class - ₩22,000" (creates negotiation)
   - Do NOT only show: "Deluxe - ₩35,000", "VIP - ₩50,000"

3. **Physical/Health Constraints** (e.g., "Need low-impact", "No caffeine", "Allergy to nuts"):
   ✅ REQUIRED: Label which options meet this constraint
   ✅ REQUIRED: Include at least 2-3 options that are safe/suitable
   ✅ REQUIRED: Warn about options that violate this constraint
   
   Example: If student needs "low-impact due to back pain":
   - Section A MUST show: "Gentle Pilates (low-impact)", "Water Aerobics (low-impact)"
   - Section A MUST warn: "High-Energy Zumba - ⚠️ High-impact, not suitable for back issues"
   - Do NOT hide impact levels or only show high-impact classes

4. **Preference Constraints** (e.g., "Prefer sweet drinks", "Like quiet environments"):
   ✅ REQUIRED: Include at least 1-2 options matching the preference
   ✅ OPTIONAL: Include alternatives if preference match isn't available
   
   Example: If student "prefers morning classes":
   - Section A SHOULD show: Several morning options (but also show afternoon if available)
   - This is less strict than hard constraints (time/budget/health)

**Verification Checklist (before generating materials):**

For EACH studentInfo item, ask yourself:
- [ ] Does Section A include options that match this constraint?
- [ ] Are there at least 2-3 viable options (not just 1)?
- [ ] If a constraint is violated, is it clearly labeled/warned?

If answer is NO to any question, you MUST revise the materials.

` : `
Student constraints (for reference - incorporate but don't state):
${taskOverview.taskScenario.studentInfo.map((item, i) => `  ${i+1}. ${item}`).join('\n')}

How to handle each constraint type:

**Budget constraint** (e.g., "Budget maximum $25"):
❌ WRONG: Don't mention prices at all
❌ WRONG: "Your budget is $25"
✅ CORRECT: List activities with prices: "Museum: $15", "Restaurant: $20-30"
✅ Include: At least 2-3 options within budget, 1-2 slightly over for negotiation

**Time constraint** (e.g., "Free Saturday after 4 PM", "Back by 10 PM"):
❌ WRONG: Don't mention times at all
❌ WRONG: "You need to be back by 10 PM"
✅ CORRECT: List activity durations and closing times: "Movie: 2 hours, last show 9 PM"
✅ Include: Options that fit within the time window

**Preference constraint** (e.g., "Prefer quiet activities"):
❌ WRONG: Only list quiet activities without labeling
❌ WRONG: "You prefer quiet"
✅ CORRECT: Label atmosphere: "Movie theater (quiet)", "Food festival (lively atmosphere)"
✅ Include: Multiple options matching preference, some not matching for negotiation

**Physical constraint** (e.g., "Cannot walk long distances"):
❌ WRONG: Don't mention physical requirements
❌ WRONG: "You can't walk far"
✅ CORRECT: Label activity level: "Museum (mostly indoor, elevator available)"
✅ Include: Multiple low-intensity options

`}
` : ''}

**Example of CORRECT constraint matching:**
\`\`\`
STUDENT CONSTRAINTS:
1. Available only on weekends
2. Budget is ₩20,000 per class
3. Need low-impact class due to back pain
4. Prefer classes in the afternoon after 2 PM

CORRECT Section A:
\`\`\`
WEEKEND CLASSES
Saturday:
- 9:00 AM: Family Yoga - ₩20,000
- 2:00 PM: Gentle Stretch (low-impact) - ₩18,000 ✅ Matches 3/4 constraints
- 4:00 PM: Water Aerobics (low-impact) - ₩19,000 ✅ Matches 3/4 constraints

Sunday:
- 11:00 AM: Advanced Pilates - ₩25,000
- 4:00 PM: Pilates for Back Care (low-impact) - ₩20,000 ✅ Matches ALL 4 constraints

Note: Saturday 1 PM Dance Fitness is high-impact and not suitable for back issues.
\`\`\`

WRONG Section A:
\`\`\`
WEEKEND CLASSES
- 9:00 AM: Family Yoga - ₩20,000 (only matches 2/4: weekend + budget)
- 11:00 AM: Advanced Pilates - ₩25,000 (only matches 1/4: weekend)
(No afternoon options, no low-impact labels, over-budget options)
\`\`\`

${taskOverview.taskScenario?.aiInfo?.length > 0 ? `
⚠️ CRITICAL - AI SECRET INFORMATION (ABSOLUTELY FORBIDDEN IN MATERIALS):

DO NOT include any of these in the materials:
${taskOverview.taskScenario.aiInfo.map((secret, i) => `  ${i+1}. ${secret}`).join('\n')}

WHY: These are secrets only the AI tutor knows. Students must DISCOVER them by asking questions.

INSTEAD: Create materials that make students WANT to ask:
- If aiInfo = "Student discount: 10% off" → Materials say "Ask about available discounts"
- If aiInfo = "Weekend special: $10 class" → Materials show regular price, student asks if deals exist
- If aiInfo = "Priority search for medical items" → Materials don't mention it, student asks about urgency

The information gap MUST drive the conversation.
` : ''}

CRITICAL INSTRUCTIONS:
1. **Authenticity**: Create materials that look and sound like real documents students would actually see (not textbook examples). Use natural formatting, realistic business names, actual phone number patterns (555-xxx-xxxx).

2. **Language Level (A2-B1)**: 
   - Use everyday vocabulary (avoid technical jargon)
   - Short, direct sentences
   - Simple grammar (present simple, common modal verbs)
   - BUT maintain authenticity—don't make menus say "pizza is $10" when real menus say "Margherita Pizza: $10.00"

2.5. **ENGLISH ONLY** (CRITICAL):
   - Even if taskOverview contains non-English text, OUTPUT MUST BE 100% ENGLISH
   - Translate concepts but keep them authentic and natural
   - Examples:
     * Korean input "김치찌개" → English output "Kimchi Stew" (not romanized "Kimchijjigae")
     * Chinese input "羽毛球" → English output "Badminton"
     * Japanese input "ヨガ" → English output "Yoga"
   - Use English that native speakers would actually use in the given context
   - If input includes culturally specific items, use common English names or brief descriptions

3. **Relevance**: Include details that directly relate to the student's constraints from studentInfo.
   
   Example: If studentInfo = "Budget: $12 max", materials should show:
   - Several options under $12 (viable choices)
   - 1-2 options at $13-15 (near-misses that create negotiation)
   - NOT all options over $20 (irrelevant, frustrating)

4. **Information Gap Design**: Materials should answer SOME questions but create NEW questions.
   
   ✅ GOOD material triggers these thoughts:
   - "I see options, but which one fits MY constraints?"
   - "Are there any special deals I don't see here?"
   - "This one is close, but can they customize it?"
   
   ❌ BAD material that kills conversation:
   - Shows ALL available options with ALL details
   - Includes all discounts, promotions, special conditions
   - Answers questions before student asks

5. **Formatting for Readability**:
   - Use clear section headers (all caps or bold)
   - Group related info together
   - Use bullet points or numbered lists
   - Add whitespace between sections
   - Example: "WEEKEND CLASSES" → list → blank line → "WEEKDAY CLASSES" → list

6. **Information Balance**: 
   The materials must provide ENOUGH information for the student to:
   - Understand the context
   - Know what options exist (in general)
   - Start asking relevant questions
   
   But LEAVE GAPS that force the student to ask the AI:
   - "Do you have [specific option I need]?"
   - "Are there any discounts available?"
   - "Can you customize this?"
   
   ✅ GOOD balance: Menu shows items and prices → Student asks about dietary options
   ❌ TOO MUCH info: Menu says "All items can be made vegan" → No need to ask
   ❌ TOO LITTLE info: Menu only says "We have food" → Student lost, can't start

${taskOverview.taskScenario?.studentInfo?.length > 0 ? `
7. **Constraint-Specific Materials**: 
   The materials MUST directly address the student challenges listed above.
   
   For each studentInfo item, ensure the materials include:
   - Options that match the constraint
   - Options that nearly match (create negotiation)
   - Details relevant to that specific constraint
   
   Example: If studentInfo = "Budget: $12 max", materials should show:
   - Several options at $10-12 ✅
   - One option at $13-14 (near-miss) ⚠️
   - NOT all options at $20+ ❌
` : ''}

OUTPUT JSON STRUCTURE:
{
  "supportingMaterialsText": "Complete text of the supporting materials in ENGLISH ONLY (menu, form, schedule, etc.)"
}

🌍 FINAL CHECK BEFORE OUTPUT:
Before returning the JSON, verify:
☐ Is every word in the supportingMaterialsText in English? (Not Korean, Chinese, Japanese, etc.)
☐ Are all proper nouns translated or kept in commonly used English forms?
☐ Would an A2-B1 EFL learner understand this English?

If any answer is NO, revise the materials to be 100% English.

📋 **MATERIAL CREATION GUIDELINES:**

✅ **CORRECT APPROACH** - Information Gap Maintained:
- Provide basic information that helps students start the conversation
- Include options that create natural questions (e.g., "Are there any discounts?")
- Leave gaps that require students to ask the AI tutor
- Present near-miss options naturally without labels

❌ **INCORRECT APPROACH** - Information Gap Broken:
- Including AI secrets (special offers, hidden discounts, secret policies)
- Providing all answers upfront
- Making conversation unnecessary

**EXAMPLE SCENARIO:**
If AI secrets include "Today only: 20% discount on Aqua Fitness" and "New member special: First month unlimited for $80", the materials should:
- Show regular prices and schedules
- NOT mention the 20% discount
- NOT mention the new member special
- Create questions like "Are there any discounts available?" or "Do you have special offers?"

📝 EXAMPLES OF CORRECT ENGLISH OUTPUT:

Even if input is in Korean:
Input: "스포츠센터에서 수업 등록하기"
Output materials: "SPORTS CENTER - CLASS SCHEDULE" (not "스포츠센터 수업 시간표")

Even if input mentions Korean items:
Input: "Budget: 20,000원"
Output materials: "Registration fee: ₩20,000" (use ₩ symbol but English words)

Even if input has Korean names:
Input: "주말 요가 수업"
Output materials: "Weekend Yoga Class" (not "주말 Yoga Class")

Now see the examples below (all in correct English format):

EXAMPLES FOR DIFFERENT MATERIAL TYPES:

**MENU/PRICE LIST:**
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.menu}
}

**MAP/DIRECTIONS:**
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.map}
}

**AVAILABILITY/SCHEDULE:**
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.availability}
}

**PRODUCT CATALOG:** (Note: This example shows regular prices only. Special offers like discounts or promotions should NOT be included—they are AI secrets)
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.catalog}
}

**TRANSPORTATION INFO:**
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.transportation}
}

**ANNOUNCEMENT/NOTICE:** (Note: This example shows regular information only. Special offers like discounts should NOT be included—they are AI secrets)
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.announcement}
}

**CLASS SCHEDULE:** (Note: This example shows regular prices only. Special offers like discounts or promotions should NOT be included—they are AI secrets)
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.schedule}
}

**FORM/APPLICATION:**
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.form}
}

**BOOKING/RESERVATION:**
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.booking}
}

**MOVIE SHOWTIMES:**
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.movie}
}

**MEDICAL APPOINTMENTS:**
{
  "supportingMaterialsText": ${MATERIAL_EXAMPLES.medical}
}

**PEER CONTEXT EXAMPLE - Friend Planning Activity:**

Task: "Plan a weekend activity with your friend"
Student role: friend
AI role: friend
Material type: "친구와 하고싶은 일 목록(가격 포함)"

Student constraints (DON'T STATE, but DO ADDRESS):
- Free on Saturday after 4 PM only
- Budget maximum $25
- Prefer quiet activities
- Need to be back home by 10 PM

✅ CORRECT Materials (Type B: Shared Reference):
{
  "supportingMaterialsText": "WEEKEND ACTIVITY IDEAS\\n\\nCULTURAL ACTIVITIES\\n- Science Museum: $15 entry, open Sat-Sun until 8 PM, typically 2-3 hours\\n  (Quiet, educational atmosphere)\\n- City Art Gallery: $12 entry, open until 9 PM, 1-2 hours\\n  (Very quiet, relaxing)\\n- Historical Walking Tour: $20, Sat 5 PM start, 2 hours\\n  (Moderate activity level)\\n\\nDINING OPTIONS\\n- Cozy Cafe: $10-15 per person, open until 10 PM\\n  (Quiet, casual)\\n- Mexican Restaurant: $18-25 per person, open until 11 PM\\n  (Lively atmosphere, popular)\\n- Pizza Place: $12-20 per person, open until midnight\\n  (Casual, can be noisy)\\n\\nENTERTAINMENT\\n- Movie Theater: $12 ticket, showtimes: 5 PM, 7 PM, 9 PM\\n  (2 hours per movie, quiet)\\n- Live Music Venue: $25 cover charge, shows 8 PM-midnight\\n  (Loud, energetic)\\n- Board Game Cafe: $8 entry + drinks, open until 11 PM\\n  (Quiet, social)\\n\\nNote: All prices are per person. Most activities are within walking distance or short bus ride from downtown."
}

Why this is correct:
✅ Prices clearly listed (student can evaluate against $25 budget)
✅ Times and durations shown (student can check if back by 10 PM)
✅ Atmosphere labeled (student can identify quiet options)
✅ Variety included (some match preferences, some don't → negotiation)
✅ Student constraints NOT stated ("Your budget is $25" ← Never say this)

❌ WRONG Materials (Missing critical info):
{
  "supportingMaterialsText": "THINGS I WANT TO DO\\n- Visit the science museum\\n- Try the new Mexican restaurant\\n- Go for a hike\\n- Watch a movie\\n- Attend a food festival"
}

Why this is wrong:
❌ No prices (student can't evaluate budget)
❌ No times (student can't check schedule)
❌ No duration (student can't see if back by 10 PM)
❌ No atmosphere description (student can't identify quiet options)

Note: 
- Materials show AI's schedule (not student's)
- Materials show AI's interests
- AI's specific free time "Sunday morning only" is in Section B (secret)
- Student will share their constraints verbally

WRONG Materials:
{
  "supportingMaterialsText": "STUDENT'S SCHEDULE\\n\\nSATURDAY\\n- Free until 1 PM\\n- Budget: $30\\n..."
}
^ This is wrong because it shows student's info, which they already know!

**FINAL VERIFICATION BEFORE OUTPUT:**

Before returning the JSON, mentally check:

1. Time matching: "${taskOverview.taskScenario?.studentInfo?.find(item => /time|schedule|weekend|morning|afternoon|evening/i.test(item)) || 'No time constraints specified'}"
   → Do materials show options in this time range? YES/NO
   
2. Budget matching: "${taskOverview.taskScenario?.studentInfo?.find(item => /budget|price|cost|\$|₩|won|dollar/i.test(item)) || 'No budget constraints specified'}"
   → Are there options ≤ this amount? YES/NO
   
3. Health/Physical matching: "${taskOverview.taskScenario?.studentInfo?.find(item => /health|physical|low-impact|allergy|dietary|pain|injury/i.test(item)) || 'No health constraints specified'}"
   → Are safe options labeled? Are unsafe options warned? YES/NO
   
4. Preference matching: "${taskOverview.taskScenario?.studentInfo?.find(item => /prefer|like|want|enjoy/i.test(item)) || 'No preference constraints specified'}"
   → Are preferred options included? YES/NO

If any answer is NO, you MUST revise the materials before outputting.

${isPeerContext ? `
5. PEER CONTEXT CHECK:
   □ Does the material show AI's personal info OR neutral reference info?
   □ Are prices/times/descriptions included for all options?
   □ Are there 2-3+ options matching EACH student constraint?
   □ Did I avoid STATING student's constraints explicitly?
   □ Can the student evaluate options using their own criteria?
   
   If any answer is NO:
   → You are missing critical information OR stating student constraints
   → Rewrite to include prices/times/descriptions without stating student's constraints
` : `
5. SERVICE CONTEXT CHECK:
   □ Does the material show neutral public information?
   □ Do the options match the student's constraints?
   □ Are there at least 2-3 viable options for the student?
   
   If any answer is NO:
   → Revise materials to include options that match student constraints
`}

🔒 FINAL SAFETY CHECK:

Before you output the JSON, read your supportingMaterialsText aloud mentally.

Ask yourself:
1. Is this 100% English? (No Korean characters like 한글, no Chinese characters like 汉字, etc.)
2. Would this material exist in an English-speaking country?
3. Is every word something an A2-B1 student would find in an English textbook?

If you answered "No" to ANY question:
→ REWRITE the entire supportingMaterialsText in proper English
→ Do NOT mix languages
→ Do NOT keep non-English words "because they're proper nouns"
→ Translate everything into natural, simple English

ONLY THEN output the JSON.

Now generate the supporting materials for the given task overview and material type.
    `;
}

export const config = {
    model: "gemini-2.5-flash",
    temperature: 0.7,
    response_format: { type: "json_object" }
};
