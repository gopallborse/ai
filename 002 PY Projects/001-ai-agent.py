# pip install langchain-groq langchain-core langgraph python-dotenv requests

# python 006-weather-agent.py

import os
import json
import requests
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

load_dotenv()


@tool
def get_current_weather(city: str) -> str:
    """Get the current weather conditions for a city.
    Use this whenever the user asks about current weather.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY")

    if not api_key:
        raise RuntimeError("OPENWEATHER_API_KEY is not configured")

    print("Weather tool called")

    url = "https://api.openweathermap.org/data/2.5/weather"

    params = {
        "q": city,
        "appid": api_key,
        "units": "metric",
    }

    response = requests.get(url, params=params)

    if not response.ok:
        raise RuntimeError(f'Could not find weather for "{city}"')

    data = response.json()

    return json.dumps({
        "city": data["name"],
        "country": data["sys"]["country"],
        "temperature": data["main"]["temp"],
        "feelsLike": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "pressure": data["main"]["pressure"],
        "windSpeed": data["wind"]["speed"],
        "conditions": data["weather"][0]["description"],
    })


@tool
def convert_currency(amount: float, from_currency: str, to_currency: str) -> str:
    """Convert an amount from one currency to another using the current
    exchange rate.

    Use this whenever the user asks to convert currencies, exchange money,
    or asks how much one currency is worth in another currency.
    """
    api_key = os.getenv("EXCHANGE_RATE_API_KEY")

    if not api_key:
        raise RuntimeError("EXCHANGE_RATE_API_KEY is not configured")

    print("Currency tool called")

    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    url = (
        f"https://v6.exchangerate-api.com/v6/"
        f"{api_key}/pair/"
        f"{from_currency}/{to_currency}/{amount}"
    )

    response = requests.get(url)

    if not response.ok:
        raise RuntimeError(
            f"Could not convert {from_currency} to {to_currency}"
        )

    data = response.json()

    if data.get("result") != "success":
        error_type = data.get("error-type", "Unknown error")
        raise RuntimeError(
            f"Could not convert {from_currency} to {to_currency}: "
            f"{error_type}"
        )

    return json.dumps({
        "amount": amount,
        "from": from_currency,
        "to": to_currency,
        "exchangeRate": data["conversion_rate"],
        "convertedAmount": data["conversion_result"],
    })


# Groq model
model = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
)


# Create the React agent
agent = create_react_agent(
    model=model,
    tools=[
        get_current_weather,
        convert_currency,
    ],
)


def main():
    result = agent.invoke({
        "messages": [
            {
                "role": "user",
                "content": "How much is 20,000 Dirham in INR?",
            }
        ]
    })

    messages = result["messages"]
    last_message = messages[-1]

    print(last_message.content)


if __name__ == "__main__":
    main()