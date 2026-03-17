import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class TrafficExplainer:
    """
    LLM reasoning module for traffic decisions.
    Uses Groq Llama-3.1-8b with a strict system prompt.
    """
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key) if api_key else None
        self.model = os.getenv("MODEL_NAME", "llama-3.1-8b-instant")
        
        # Strict boundary-enforced system prompt
        self.system_prompt = (
            "You are the 'Traffic AI Explainer', a specialized component of a Smart Traffic Management System. "
            "Your ONLY purpose is to provide natural language explanations for traffic signal decisions based on provided data. "
            "STRICT BOUNDARIES: "
            "1. Only discuss traffic, vehicle counts, wait times, congestion, and signal phases. "
            "2. Never provide generic advice, coding help, or discuss topics outside of this traffic project. "
            "3. If an emergency vehicle is detected, prioritize explaining the safety override. "
            "4. Keep explanations professional, concise, and focused on efficiency. "
            "5. Do NOT answer any questions unrelated to the current traffic state."
        )

    def explain_decision(self, phase_data: dict) -> str:
        """
        Generates a reasoning string for the current traffic state.
        """
        if not self.client:
            return "Groq AI not configured."

        prompt = (
            f"Current State: {phase_data['phase']} Phase\n"
            f"Stats: {phase_data['metrics']}\n"
            f"Wait Times: {phase_data['wait_times']}\n"
            f"Emergency Detected: {phase_data.get('emergency', False)}\n\n"
            "Explain the reasoning for the current signal timing."
        )

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt},
                ],
                model=self.model,
                temperature=0.2,
                max_tokens=150,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            return f"Reasoning Error: {str(e)}"

# Singleton
explainer = TrafficExplainer()
