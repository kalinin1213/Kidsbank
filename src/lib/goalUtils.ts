export type GoalAllocation = {
  allocated: number;
  percent: number;
  remaining: number;
};

/**
 * Sequentially allocates a balance across goals in priority order.
 * The first goal receives funds first (up to its target),
 * then the remainder flows to the next goal, and so on.
 */
export function computeGoalAllocations(
  goals: { id: string; target_amount: number }[],
  balance: number
): Map<string, GoalAllocation> {
  const allocations = new Map<string, GoalAllocation>();
  let remainingBalance = balance;

  for (const goal of goals) {
    const allocated = Math.max(0, Math.min(remainingBalance, goal.target_amount));
    const percent = goal.target_amount > 0
      ? Math.min(100, (allocated / goal.target_amount) * 100)
      : 0;
    const remaining = Math.max(0, goal.target_amount - allocated);

    allocations.set(goal.id, { allocated, percent, remaining });

    remainingBalance = Math.max(0, remainingBalance - goal.target_amount);
  }

  return allocations;
}
