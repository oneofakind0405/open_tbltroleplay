/**
 * Step 2: Task Outcome Checklist Generator
 * Purpose: Creates communication goals (not action scripts) for students to achieve
 * Input: taskOverview from Step 1 (including taskScenario with info gap)
 * Output: JSON array of 4-5 goal-oriented checklist items
 * Used by: teacher.html 2단계 "AI로 체크리스트 제안받기" 버튼
 */

export const systemPrompt = `You are a TBLT assessment expert who designs outcome-based checklists for EFL role-play tasks.

Your specialty: Creating communication goals (not action scripts) that focus on WHAT students must achieve, not HOW they should say it.

CRITICAL: 
- Output ONLY valid JSON (no markdown, no explanations)
- All text in simple English (A2-B1 vocabulary)
- Each checklist item = one measurable communication outcome
- Ensure valid JSON syntax (properly close all brackets, commas, and quotes).`;

export function generatePrompt(taskOverview) {
    return `
Based on the following task overview:
${JSON.stringify(taskOverview, null, 2)}

${taskOverview.taskScenario && 
  taskOverview.taskScenario.studentInfo?.length > 0 ? `
INFORMATION GAP CONTEXT:
The student knows these constraints:
${taskOverview.taskScenario.studentInfo.map((item, i) => `  ${i+1}. ${item}`).join('\n')}

The AI has this hidden information (student must discover through questions):
${taskOverview.taskScenario.aiInfo.map((item, i) => `  ${i+1}. ${item}`).join('\n')}

CRITICAL: Create checklist items that verify the student successfully DISCOVERED this hidden information through questioning and negotiation.
` : ''}

Generate a checklist of key communication goals the student must achieve to complete their task.

CRITICAL INSTRUCTIONS:
1. **GOALS not SCRIPTS**: 
   Write communication outcomes (what to achieve), NOT dialogue scripts (what to say).
   
   ✅ GOOD: "Find out which drinks are under $5"
   ❌ BAD: "Say: 'Do you have any drinks under $5?'"
   
   This encourages students to use their own words and negotiate meaning naturally.
2. **Information Gap Discovery**: 
   MANDATORY if taskScenario exists: Create items that verify the student discovered specific hidden information.
   
   For each piece of AI secret info, include a checklist item like:
   - "Discover if [specific option] is available"
   - "Find out about [hidden discount/policy]"
   - "Ask about [AI-only knowledge]"
   
   DO NOT reveal the answers in the checklist—students must ask to discover.
3. **Quantity**: Generate exactly 4-5 checklist items.
   - Too few (< 4): Task feels incomplete
   - Too many (> 5): Overwhelms students, breaks conversational flow
4. **Measurability**: Each item must be ONE verifiable outcome.
   
   ✅ GOOD: "Confirm the final price including any discounts"
   ❌ BAD: "Talk about prices and ask questions and check discounts"
   
   The student/teacher should clearly know if this goal was achieved (YES/NO).
5. **Logical Sequence**: Order items to match natural conversation flow:
   
   Typical sequence:
   1. State needs/constraints → 2. Ask questions/discover info → 3. Negotiate/clarify → 4. Confirm decision → 5. Complete transaction
   
   Example flow for coffee task:
   ① Explain conditions → ② Discover options → ③ Ask about customization → ④ Confirm price → ⑤ Order
   
   Each checklist should ideally include at least:
   - 1 item about explaining needs or constraints
   - 2 items about discovering information
   - 1 item about confirming or completing the outcome
6. **Constraint Communication**: 
   At least ONE checklist item must verify the student communicated their constraints from studentInfo.
   
   Example: If studentInfo includes "Budget: $12 max", checklist should have:
   "Explain your budget limit and find options within your price range"
7. **Student Perspective**: 
   Write from student's viewpoint using action verbs: "Find out", "Discover", "Explain", "Confirm", "Ask about"
   
   ✅ GOOD: "Find out which classes fit your schedule"
   ❌ BAD: "The student should ask about class schedules"
   
   Always begin each checklist item with an action verb from the student's viewpoint (e.g., "Find out", "Explain", "Ask about", "Confirm", "Decide").
8. **Discovery Verification**: 
   For EACH piece of aiInfo, create a matching checklist item that verifies discovery.
   
   If aiInfo = "Student discount: 10% off with ID", then checklist must include:
   "Discover if any special discounts or promotions are available"
   
   The wording should NOT spoil the answer (don't say "Find out about the 10% student discount").

OUTPUT JSON STRUCTURE:
{
  "checklistItems": [
    "Goal describing what student must discover (e.g., 'Find out if decaf options exist')",
    "Goal about communicating constraints (e.g., 'Explain your budget and time limits')",
    "Goal about negotiation (e.g., 'Ask about customization or alternatives')",
    "Goal about confirmation (e.g., 'Confirm the final price before ordering')",
    "Goal about task completion (4-5 items total)"
  ]
}

**EXAMPLE for coffee ordering task (Goal-oriented with Information Gap):**
{
  "checklistItems": [
    "Explain your dietary needs, budget, and time constraints",
    "Discover if there are any special discounts or secret menu items available today",
    "Find out which drinks meet your needs and preferences",
    "Ask about customization options such as sweetness or size",
    "Confirm the final price and complete your order"
  ]
}

**EXAMPLE for lost baggage task (Goal-oriented with Information Gap):**
{
  "checklistItems": [
    "Report your missing suitcase with flight number and arrival time",
    "Describe your suitcase and explain why it is urgent to find it",
    "Ask about priority search or special handling for medical items",
    "Discover what assistance or insurance coverage is available",
    "Confirm you received a tracking number and know how to follow up"
  ]
}


⚠️ DO NOT include the example text below in your output. Return ONLY the JSON result.

Now generate the checklist based on the provided task overview.
    `;
}

export const config = {
    model: "gpt-4o",
    temperature: 0.7,
    response_format: { type: "json_object" }
};