import os
import json
from typing import Optional, List
from openai import OpenAI

# Initialize OpenAI/Groq client if API key is provided
API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY")
BASE_URL = os.getenv("LLM_BASE_URL")  # Optional: e.g. https://api.groq.com/openai/v1

client = None
if API_KEY:
    try:
        if BASE_URL:
            client = OpenAI(api_key=API_KEY, base_url=BASE_URL)
        else:
            client = OpenAI(api_key=API_KEY)
        print("AI Chatbot: Initialized LLM Client.")
    except Exception as e:
        print(f"AI Chatbot Error: Failed to initialize LLM client: {e}")

# Pre-defined Medical Knowledge Base for RAG (Retrieval-Augmented Generation)
GLAUCOMA_KNOWLEDGE_BASE = [
    {
        "topic": "What is glaucoma?",
        "content": "Glaucoma is a group of eye conditions that damage the optic nerve, the health of which is vital for good vision. This damage is often caused by an abnormally high pressure in your eye (intraocular pressure) and is one of the leading causes of blindness for people over the age of 60."
    },
    {
        "topic": "Glaucoma Types",
        "content": "The main types of glaucoma are: 1. Open-angle glaucoma (most common, fluid does not drain well, slow pressure buildup). 2. Angle-closure glaucoma (fluid blockage happens suddenly, medical emergency). 3. Normal-tension glaucoma (optic nerve damage occurs even with normal eye pressure). 4. Pigmentary glaucoma (pigment granules block drainage channels)."
    },
    {
        "topic": "Symptoms of Glaucoma",
        "content": "Open-angle glaucoma has virtually no symptoms in its early stages. Over time, patchy blind spots in your peripheral or central vision develop. Acute angle-closure glaucoma is a medical emergency and has severe symptoms: severe eye pain, headache, nausea, blurred vision, halos around lights, and eye redness."
    },
    {
        "topic": "Glaucoma Risk Factors",
        "content": "High risk factors include: High internal eye pressure (IOP), being over age 60, family history of glaucoma, medical conditions like diabetes, heart disease, high blood pressure, extreme nearsightedness or farsightedness, eye injury, or taking corticosteroid medications for a long time."
    },
    {
        "topic": "Foods to Eat (Good for Eyes)",
        "content": "To support eye health, eat foods rich in vitamins A, C, E, and Zinc: Leafy greens (spinach, kale), fish rich in omega-3 (salmon, tuna), citrus fruits, nuts (walnuts, almonds), and carrots. These contain antioxidants that protect the optic nerve."
    },
    {
        "topic": "Foods to Avoid",
        "content": "If you have glaucoma, limit caffeine (coffee, energy drinks) because it can temporarily raise intraocular pressure. Also, avoid high-sodium foods, excessive alcohol, and foods high in saturated fats, which can negatively affect cardiovascular health and ocular blood flow."
    },
    {
        "topic": "Eye Exercises & Care",
        "content": "While eye exercises do not cure glaucoma or reduce eye pressure, simple practices like the 20-20-20 rule (look 20 feet away for 20 seconds every 20 minutes) reduce digital eye strain. Keep eyes hydrated with artificial tears, avoid rubbing your eyes, and get regular comprehensive eye exams."
    },
    {
        "topic": "Glaucoma Treatments",
        "content": "Treatments cannot reverse existing vision loss, but can prevent further damage. Options include: 1. Prescription eye drops (PGAs like Latanoprost, Beta-blockers like Timolol to lower pressure). 2. Oral medications. 3. Laser therapy (Trabeculoplasty). 4. Surgery (Trabeculectomy, glaucoma drainage implants, minimally invasive glaucoma surgery)."
    },
    {
        "topic": "Medication Guidelines & Reminders",
        "content": "Take prescribed eye drops exactly at the same time every day. Never skip doses. Wash your hands before applying drops, tilt your head back, pull down the lower eyelid, squeeze one drop, and close your eye for 1-2 minutes while pressing the tear duct to maximize absorption."
    }
]

SYSTEM_PROMPT = """
You are an expert AI Ophthalmology and Glaucoma Assistant.
Your primary role is to answer questions related to glaucoma, eye diseases, vision care, lifestyle modifications, eye exercises, diet recommendations, and explanation of retinal fundus predictions.

CRITICAL DIRECTIVES:
1. Under no circumstances should you answer questions unrelated to eye health, medicine, glaucoma, or general healthcare.
2. If the user asks about coding, math, general history, cooking, programming, jokes, translation, or other non-medical topics, you MUST politely refuse to answer. You should say: "I am an AI Glaucoma Assistant. I can only answer glaucoma-related and eye-health medical queries."
3. Keep your answers clear, professional, and helpful. Translate complex medical jargon into easy-to-understand terms.
4. If a prediction result is provided (e.g. probability, risk level), explain it and offer custom advice based on that risk.
"""

def retrieve_rag_context(query: str) -> str:
    """
    RAG Engine: Searches the glaucoma medical knowledge base for chunks matching keywords in the query.
    """
    query_words = set(query.lower().split())
    matches = []
    
    for entry in GLAUCOMA_KNOWLEDGE_BASE:
        # Simple overlap search to retrieve matching contexts
        topic_words = set(entry["topic"].lower().split())
        content_words = set(entry["content"].lower().split())
        all_words = topic_words.union(content_words)
        
        overlap = query_words.intersection(all_words)
        if len(overlap) > 0:
            matches.append((len(overlap), entry["content"]))
            
    # Sort matches by keyword overlap score
    matches.sort(key=lambda x: x[0], reverse=True)
    
    # Return combined top 3 matching chunks
    if matches:
        return "\n\n".join([item[1] for item in matches[:3]])
    
    # Fallback to general glaucoma summary context
    return GLAUCOMA_KNOWLEDGE_BASE[0]["content"]

def query_ai_chatbot(user_message: str, chat_history: List[dict], prediction_info: Optional[dict] = None) -> str:
    """
    Unified entry point for AI Chatbot.
    - Inspects the message for non-medical topics.
    - Automatically pulls RAG context.
    - Invokes OpenAI/Groq API if configured, otherwise falls back to a highly realistic local semantic parser.
    """
    # 1. Broad safety filter for non-medical queries before passing to AI (saves API tokens and enforces safety)
    non_medical_keywords = ["code", "programming", "python", "javascript", "website", "recipe", "joke", "poem", "history of", "math", "calculator", "weather", "news"]
    message_lower = user_message.lower()
    for kw in non_medical_keywords:
        if kw in message_lower and not ("eye" in message_lower or "glaucoma" in message_lower or "medical" in message_lower):
            return "I am an AI Glaucoma Assistant. I can only answer glaucoma-related and eye-health medical queries."

    # 2. Fetch context from RAG
    rag_context = retrieve_rag_context(user_message)
    
    # 3. Incorporate prediction stats if provided
    prediction_context = ""
    if prediction_info:
        prediction_context = f"\nPatient's Retina Scan Prediction Info:\n- Disease: {prediction_info.get('disease_name', 'Glaucoma')}\n- Prediction Probability: {prediction_info.get('probability')}% \n- Confidence Score: {prediction_info.get('confidence_score')}%\n- Risk Level: {prediction_info.get('risk_level')}"

    # Construct chat payload
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"Relevant Ophthalmology Facts:\n{rag_context}{prediction_context}"}
    ]
    
    # Append recent conversation history
    for chat in chat_history[-6:]:  # Keep context window small and responsive
        messages.append({"role": chat["role"], "content": chat["content"]})
        
    # Append current message
    messages.append({"role": "user", "content": user_message})

    # 4. Invoke LLM if configured
    if client:
        try:
            response = client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "gpt-3.5-turbo"),
                messages=messages,
                temperature=0.3,
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"LLM API execution error: {e}. Falling back to offline semantic engine.")

    # 5. Local Semantic Fallback Engine (Medical RAG response builder)
    # If the user is offline or doesn't provide an API key, we build a highly clinical response based on the RAG match.
    if "risk" in message_lower or "report" in message_lower or "probability" in message_lower:
        if prediction_info:
            prob = prediction_info.get('probability')
            risk = prediction_info.get('risk_level')
            return f"Based on your latest scan, our AI model detected a **{prob}% probability** of Glaucoma, placing you in the **{risk} Risk** category. Since this is an automated screening, I strongly suggest booking an appointment with Dr. Sarah Connor using our Appointments tab to get a comprehensive physical eye exam (like tonometry and visual field testing)."
        else:
            return "You haven't uploaded a retina scan yet. Once you upload a fundus image in the dashboard, I can explain the specific probability metrics, risk scores, and the generated Grad-CAM heatmap."
            
    if "food" in message_lower or "diet" in message_lower or "eat" in message_lower:
        return f"Regarding your diet: {GLAUCOMA_KNOWLEDGE_BASE[4]['content']} \n\nWhat to limit: {GLAUCOMA_KNOWLEDGE_BASE[5]['content']}"

    if "exercise" in message_lower or "strain" in message_lower:
        return f"For eye health and straining: {GLAUCOMA_KNOWLEDGE_BASE[6]['content']}"

    if "treatment" in message_lower or "cure" in message_lower or "drop" in message_lower or "surgery" in message_lower:
        return f"Managing glaucoma: {GLAUCOMA_KNOWLEDGE_BASE[7]['content']}"

    # Default to the most relevant RAG content chunk
    return f"Here is what you need to know about that: {rag_context}\n\n*Note: This is AI-generated advice. Please consult your physician for specific treatments.*"
