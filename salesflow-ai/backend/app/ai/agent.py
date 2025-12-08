from datetime import datetime
import json
import os

from openai import AsyncOpenAI

from .tools import SALES_AGENT_TOOLS
from .tool_executor import ToolExecutor
from .system_prompt import build_system_prompt

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def run_sales_agent(
    message: str,
    user_id: str,
    db,
    session_id: str = None,
    message_history: list = None,
) -> dict:
    """Run the sales agent with function calling."""

    user = (
        db.table("profiles")
        .select("name, vertical, company_id, monthly_revenue_goal")
        .eq("id", user_id)
        .single()
        .execute()
    )

    user_context = user.data or {}

    if user_context.get("company_id"):
        company = (
            db.table("companies")
            .select("name, knowledge_base")
            .eq("id", user_context["company_id"])
            .single()
            .execute()
        )

        if company.data:
            user_context["company_name"] = company.data.get("name")
            user_context["company_knowledge"] = company.data.get("knowledge_base", "")

    start_of_month = datetime.now().replace(day=1)
    revenue = (
        db.table("deals")
        .select("value")
        .eq("user_id", user_id)
        .eq("status", "won")
        .gte("closed_at", start_of_month.isoformat())
        .execute()
    )

    revenue_data = revenue.data if revenue else []
    user_context["current_revenue"] = sum([d.get("value") or 0 for d in revenue_data])

    system_prompt = build_system_prompt(user_context)

    messages = [{"role": "system", "content": system_prompt}]

    if message_history:
        messages.extend(message_history)

    messages.append({"role": "user", "content": message})

    tool_executor = ToolExecutor(db, user_id, user_context)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=SALES_AGENT_TOOLS,
        tool_choice="auto",
    )

    assistant_message = response.choices[0].message
    tools_used = []

    while assistant_message.tool_calls:
        messages.append(
            {
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in assistant_message.tool_calls
                ],
            }
        )

        for tool_call in assistant_message.tool_calls:
            tool_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments or "{}")

            result = await tool_executor.execute(tool_name, arguments)
            tools_used.append({"tool": tool_name, "args": arguments})

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, default=str),
                }
            )

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=SALES_AGENT_TOOLS,
            tool_choice="auto",
        )

        assistant_message = response.choices[0].message

    db.table("ai_chat_messages").insert(
        {
            "session_id": session_id,
            "user_id": user_id,
            "role": "user",
            "content": message,
        }
    ).execute()

    db.table("ai_chat_messages").insert(
        {
            "session_id": session_id,
            "user_id": user_id,
            "role": "assistant",
            "content": assistant_message.content,
            "tools_used": tools_used,
        }
    ).execute()

    return {
        "message": assistant_message.content,
        "tools_used": tools_used,
        "session_id": session_id,
    }

