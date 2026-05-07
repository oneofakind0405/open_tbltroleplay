/**
 * Step 1: Task Overview Generator
 * Purpose: Creates the foundational structure for a TBLT role-play task
 * Input: keyword (e.g., "ordering coffee", "booking a hotel")
 * Output: JSON with taskGoal, context, roles, and information gap (taskScenario)
 * Used by: teacher.html 1단계 "AI로 초안 생성" 버튼
 */

export const systemPrompt = `You are a TBLT (Task-Based Language Teaching) expert specializing in authentic, meaning-focused tasks for A2-B1 EFL learners. 

Your role: Design role-play scenarios where students must complete real-world goals through negotiation of meaning.

CRITICAL OUTPUT RULES:
- Return ONLY a valid JSON object (no explanations, no markdown, no code blocks)
- All text fields MUST use simple, natural English (A2-B1 vocabulary)
- Every task MUST create a genuine need to communicate (information gap required)
- Each field should be concise (under 20 words per field)

🎯 DIVERSITY REQUIREMENT 🎯
- Generate UNIQUE and VARIED aiInfo content for each task
- Use different numbers, percentages, times, and offers each time
- Be creative and unpredictable with each generation`;

export function generatePrompt(keyword) {
    return `
Based on the keyword "${keyword}", generate a structured role-play task where an A2-B1 student must achieve a concrete, real-world outcome by communicating with an AI partner.

The task must create an information gap: the student and AI each know different pieces of information, forcing genuine questions and negotiation.

CRITICAL INSTRUCTIONS:
1. **taskScenario.studentInfo**: Generate 4-6 specific details the student knows.
   
   CONSTRAINT CATEGORIES (select relevant ones based on task context):
   
   - Time constraints (e.g., "available weekends only", "need it by 3 PM")
   - Budget limits (e.g., "maximum $15", "under ₩20,000")
   - Physical/activity needs (ONLY if relevant to the task)
     * Fitness tasks: "low-impact only", "have knee pain", "beginner level"
     * Food tasks: "vegetarian", "no spicy food", "prefer light meals"
     * Activity tasks: "cannot do a lot of walking", "prefer indoor activities"
     * ❌ DO NOT add: allergies unless the task is explicitly about food/eating
   - Preferences (e.g., "prefer morning", "like quiet places", "enjoy outdoor activities")
   - Urgency factors (e.g., "need to decide today", "flight leaves in 2 hours")
   
   ⚠️ CRITICAL: Choose constraints that NATURALLY fit the task context.
   Only include 4–6 constraints. Avoid redundancy — do not repeat similar ideas.
   
   Examples of GOOD constraint matching:
   - Fitness class registration → Include physical limitations (knee pain, low-impact)
   - Restaurant reservation → Include dietary preferences (vegetarian, no spicy)
   - Planning weekend activity → Include activity preferences (outdoor, not too physical)
   - Ordering coffee → Include dietary restrictions (no caffeine, prefer sweet, allergic to nuts)
   
   Examples of BAD constraint matching:
   - Planning weekend activity → ❌ "Have a peanut allergy" (irrelevant unless planning food)
   - Registering for yoga class → ❌ "Allergic to dairy" (not related to exercise)
   - Booking hotel room → ❌ "Cannot eat gluten" (not about eating)
   
   CRITICAL: These details must make it IMPOSSIBLE to complete the task without asking the AI for information.
   The student cannot simply state their needs—they must discover if solutions exist.

2. **taskScenario.aiInfo**: Generate 2–4 pieces of information ONLY the AI role knows.

   The secret information must depend on the SITUATION and the AI role.
   Choose realistic, context-matching details that a real person in that role would naturally know.

   ---
   ⚠️ CRITICAL RULE FOR aiInfo:
   The secret info MUST be dynamic, situational, or transactional. 
   It should NOT just be *more* static schedule or list info.

   ✅ GOOD (Situational/Transactional): 
       "Today's special: 20% off", "Only 3 spots left", "New member promotion (ends today)", 
       "The 6 PM class is full, but I can add you to the waitlist"

   ❌ BAD (Just more static info): 
       "We also have a class on Monday", "Yoga is $10", "Swimming is on Tuesdays" 
       (This info belongs in the public Supporting Materials, not here!)
   ---

   Purpose: aiInfo should sustain the information gap and promote negotiation of meaning,
   not just provide a direct solution.

   Keep items short (≤ 18 words when possible), realistic, and appropriate to the AI role.

   Examples by context type:
   - Service contexts → special discounts, limited availability, hidden options, current status
   - Personal contexts → personal constraints, hidden preferences, schedule conflicts, special knowledge
   - Professional contexts → deadline extensions, appointment availability, special opportunities, limited resources
   - Casual encounters → local knowledge, current conditions, time-sensitive info, alternative options

   👉 aiInfo Generation Guidelines:

   Create 2–4 unique, situational facts that:
   - Include specific numbers, times, percentages, or quantities
   - Are time-sensitive or limited availability
   - Match the context and AI role naturally
   - Would only be revealed through conversation

   Good pattern examples:
   - Time-sensitive: "Today only: 25% off", "Until 3 PM: special rate"
   - Limited availability: "Only 3 spots left", "Last 2 in stock"
   - Hidden options: "Secret menu available", "Member-only discount"
   - Current status: "Just opened up", "Cancellation just came in"
   - Personal constraints: "I can only stay until 6 PM", "My budget is $25"
   - Local knowledge: "The shortcut is closed today", "Bus 15 doesn't run on Sundays"

   Follow the internal comment below to shape the exact style and reasoning of aiInfo.

   ---
   # AI-INFO GENERATION GUIDELINES:
   # - Generate 2–4 short, concrete, situational facts
   # - Each line ≤18 words, include numbers/time/percentages where natural
   # - Avoid generic descriptions like "offers a variety" or "is known for"
   # - Make each fact sound like what a real person would reveal in conversation
   # - Ensure facts require negotiation of meaning (revealed only when asked)
   ---

   **Information Gap**: The information gap must require back-and-forth dialogue:
   - Student asks → AI reveals partial info → Student clarifies → AI provides details
   - Avoid scenarios where one question gets all answers
   
   **CRITICAL: Ensure Negotiation is Possible**:
   - For scheduling tasks: studentInfo and aiInfo MUST have at least one overlapping time slot
   - For preference-based tasks: Include "prefer X but open to Y" phrasing to allow compromise
   - Constraints should be challenging but NOT impossible to resolve
   - The goal is meaningful negotiation, not deadlock

   ⚠️ CRITICAL SCHEDULING RULE ⚠️
   For tasks involving meeting times, appointments, or scheduling:
   - studentInfo and aiInfo time constraints MUST have at least 1 hour of overlap
   - Check the logic: If student says "free Saturday 2-8 PM or Sunday 10 AM-3 PM",
     AI MUST be free during at least ONE of those windows
   - Example GOOD: Student "Saturday 2-8 PM", AI "Saturday 4-7 PM" → Overlap: 4-7 PM ✓
   - Example BAD: Student "Saturday only", AI "Sunday only" → No overlap ✗
   - Before finalizing, verify that a meeting IS actually possible


   
3. **Language Simplicity**: 
   - Use common, everyday vocabulary (no idioms, no technical jargon)
   - Short sentences (maximum 15 words per sentence)
   - Present simple tense preferred (avoid complex grammar)
   - Concrete, specific wording (e.g., "You have $5" not "You have limited funds")

4. **Authentic Context**: 
   - Set the task in a SPECIFIC location (e.g., "at the gym reception desk", not just "at a gym")
   - The situation should be one teenagers/young adults actually encounter in real life
   - Avoid fantasy or overly academic scenarios

5. **DO NOT include constraints about the learner's language proficiency or comprehension** (e.g., "not fluent in the local language", "need clarification due to language").

6. **Concrete, Measurable Details REQUIRED**:
   
   Every studentInfo item MUST start with "You" and include specific numbers, times, or quantities:
   
   ✅ GOOD examples (context-appropriate):
   - Time: "You are available weekends only", "You need it before 3 PM", "You have a flight that leaves in 2 hours"
   - Money: "You have maximum $15", "Your budget is under $20", "You only have $5 cash"
   - Physical (for fitness tasks): "You need low-impact exercise (you have a bad knee)", "You are at beginner level", "You cannot run"
   - Dietary (for food tasks only): "You cannot drink caffeine", "You are vegetarian", "You prefer mild flavors"
   - Activity preferences: "You prefer outdoor activities", "You like quiet places", "You enjoy group activities"
   - Quantity: "You need 3 tickets", "You can bring maximum 5 people", "You have only 2 bags"
   
   ❌ BAD examples (context-inappropriate):
   - "You are allergic to nuts" when task is not about eating
   - "You prefer healthier options" → Too vague, be specific
   - "You don't have much time" → Use exact time constraint
   
   🚨 CRITICAL FORMAT RULE:
   ALL studentInfo items MUST begin with "You" or "You are/have/need/prefer/can/cannot"
   This ensures proper translation and clarity for students.
   
   Use simple A2-B1 wording: short phrases, common words, no complex grammar.

OUTPUT JSON STRUCTURE:
{
  "taskGoal": "One sentence stating what the student must accomplish. Example: 'Find a coffee under $5 without caffeine'",
  "context": "One sentence with location + situation. Example: 'At a busy coffee shop during your lunch break'",
  "studentRoleSimple": "1-2 words only. Examples: 'customer', 'passenger', 'visitor', 'patient'",
  "aiRoleSimple": "1-2 words only. Examples: 'barista', 'staff member', 'receptionist', 'doctor'",
  "taskScenario": {
    "studentInfo": [
      "Time constraint (e.g., 'You can only attend on weekends')",
      "Budget limit (e.g., 'You have maximum $12 per class')",
      "Health/physical need (e.g., 'You have knee pain and need low-impact exercise')",
      "Preference (e.g., 'You prefer morning classes before 10 AM')",
      "Additional constraint as needed (4-6 items total)"
    ],
    "aiInfo": [
      "2–4 secrets that match the situation (see context examples above)"
    ]
  }
}

**EXAMPLE for "ordering coffee":**
{
  "taskGoal": "Order a drink that meets your dietary restrictions and budget",
  "context": "You are at a busy coffee shop during lunch break. You need to order quickly.",
  "studentRoleSimple": "customer",
  "aiRoleSimple": "barista",
  "taskScenario": {
    "studentInfo": [
    "You cannot drink caffeine (doctor's order)",
    "You hate bitter flavors and prefer sweet drinks",
    "You only have $5 to spend",
    "You need to be back at school in 15 minutes"
    ],
    "aiInfo": [
      "Student ID gets 10% off all drinks today",
      "Secret menu: Decaf sweet peach tea for $4.80",
      "Quick-pickup orders (cold drinks only) are ready in 5 minutes"
    ]
  }
}

**EXAMPLE for "lost baggage":**
{
  "taskGoal": "Report your missing suitcase and get help for your urgent needs",
  "context": "You are at the airport lost and found counter. Your next flight is soon.",
  "studentRoleSimple": "passenger",
  "aiRoleSimple": "airline staff",
  "taskScenario": {
    "studentInfo": [
      "Your suitcase is dark colored (black or navy blue)",
    "You have important medication inside that you need urgently",
    "Your flight to another city leaves in 2 hours",
    "You can only wait 30 minutes before going to your gate"
    ],
    "aiInfo": [
      "We can start a priority search (medical items) within 10 minutes",
      "We can issue a $75 voucher for immediate needs right now",
      "The next express delivery to your destination leaves at 5 PM today"
    ]
  }
}

**EXAMPLE for "fitness class registration":**
{
  "taskGoal": "Register for a fitness class that fits your schedule and health needs",
  "context": "You are at a sports center reception desk.",
  "studentRoleSimple": "customer",
  "aiRoleSimple": "receptionist",
  "taskScenario": {
    "studentInfo": [
      "You can only attend classes on weekends",
      "You need low-impact exercise (you have knee pain)",
    "Budget ≤ $12 per class",
    "You prefer morning classes before 10 AM",
    "You need to start next week"
    ],
    "aiInfo": [
      "Weekend special: Water aerobics class (9:30 AM) is $10",
      "A cancellation just opened one spot in the 9 AM gentle yoga class",
      "Only 3 spots left in the 9:30 AM water aerobics class"
    ]
  }
}

**EXAMPLE for "planning weekend activity with friend":**
{
  "taskGoal": "Plan a weekend activity with your friend that fits both schedules and budgets",
  "context": "You and your friend are texting to plan something fun for this weekend. You both have different schedules.",
  "studentRoleSimple": "friend",
  "aiRoleSimple": "friend",
  "taskScenario": {
    "studentInfo": [
      "You are free on Saturday after 2 PM or Sunday before 6 PM",
      "Your budget is maximum $25",
      "You prefer outdoor activities",
      "You cannot do activities with a lot of walking (recovering from ankle injury)",
      "You need to be back home by 8 PM"
    ],
    "aiInfo": [
      "Free on Saturday from 4 PM to 7 PM",
      "Prefers indoor activities but okay with outdoor if not too hot",
      "Has a budget of $20",
      "Must leave by 7 PM for a family dinner"
    ]
  }
}

**EXAMPLE for "asking for directions from a stranger":**
{
  "taskGoal": "Find the fastest way to get to the train station",
  "context": "You are lost in a new city and need to ask a local person for directions.",
  "studentRoleSimple": "tourist",
  "aiRoleSimple": "local person",
  "taskScenario": {
    "studentInfo": [
      "You need to catch the 3:30 PM train",
      "You have a heavy suitcase",
      "You prefer not to walk more than 10 minutes",
      "You don't have much cash for a taxi"
    ],
    "aiInfo": [
      "Bus 15 doesn't run on Sundays (today is Sunday)",
      "The shortcut through the park is closed for construction",
      "Taxi stand is 2 blocks away but costs $8",
      "Free shuttle bus leaves from the mall every 20 minutes"
    ]
  }
}

**EXAMPLE for "doctor appointment":**
{
  "taskGoal": "Schedule a medical check-up that fits your schedule",
  "context": "You are calling the doctor's office to make an appointment.",
  "studentRoleSimple": "patient",
  "aiRoleSimple": "receptionist",
  "taskScenario": {
    "studentInfo": [
      "You are only available on weekdays after 5 PM",
      "You need to see Dr. Johnson specifically",
      "You have insurance that covers routine check-ups",
      "You prefer morning appointments if possible"
    ],
    "aiInfo": [
      "Dr. Johnson is on vacation until next week",
      "Emergency walk-in slots available until 4 PM today",
      "Free health screening clinic opens at 9 AM tomorrow",
      "Dr. Smith has a cancellation at 5:30 PM today"
    ]
  }
}

Note: No food allergies included because the task is about planning activities, not eating.
If they decide to include dinner as part of the plan, dietary preferences could come up naturally in conversation.

**CONSTRAINT RELEVANCE CHECK** (CRITICAL):

Before finalizing the studentInfo list, verify EACH constraint:

□ Is this constraint DIRECTLY relevant to achieving the task goal?
□ Would a real person mention this constraint when doing this task?
□ Does this constraint create meaningful communication opportunities?
□ Can the task be completed through negotiation? (NOT deadlocked)

If answer is NO to any question for a constraint:
→ REMOVE that constraint
→ Replace with a more relevant one

COMMON MISTAKES TO AVOID:

❌ Adding food allergies to non-food tasks
   Example: Planning weekend activities → Don't add "peanut allergy"
   (Unless the planned activity involves eating!)

❌ Adding physical limitations to non-physical tasks
   Example: Booking movie tickets → Don't add "bad knee"
   (Not relevant to watching a movie!)

❌ Adding arbitrary health constraints
   Example: Shopping for clothes → Don't add "no caffeine"
   (Not related to shopping!)

✅ CORRECT approach:

Match constraints to task context:
- Food/dining tasks → dietary preferences, allergies OK
- Fitness/sports tasks → physical limitations, fitness level OK
- Planning activities → time, budget, activity type preferences OK
- Travel tasks → time urgency, budget, luggage constraints OK
- Shopping tasks → budget, preferences, size/quantity needs OK

Now generate the task overview for the keyword: "${keyword}"

REMEMBER: Be creative and unique with each generation - use different numbers, percentages, times, and offers!
    `;
}

export const config = {
  model: "gpt-4o",
  temperature: 0.8,
  response_format: { type: "json_object" },
  max_tokens: 900
};
