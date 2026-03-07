import os
import smtplib
from email.message import EmailMessage
from supabase import create_client, Client
from dotenv import load_dotenv
import random
import time

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
# IMPORTANT: For an external worker script to read auth.users or user emails safely,
# it normally requires the SUPABASE_SERVICE_ROLE_KEY.
# Since we only have the anon key in .env, we will query `user_usage` (which is public to authenticated users 
# based on our RLS, but might be restricted for anon). 
# For demonstration purposes, we'll try to fetch user UUIDs from `user_usage`.
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    exit(1)

VERSES = [
    {
        "s": "Karmanye vadhikaraste ma phaleshu kadachana",
        "e": "You have a right to perform your prescribed duty, but you are not entitled to the fruits of action.",
        "r": "2.47"
    },
    {
        "s": "Uddhared atmanatmanam natmanam avasadayet",
        "e": "Let a man lift himself by his own Self alone; let him not lower himself, for this self alone is the friend of oneself.",
        "r": "6.5"
    },
    {
        "s": "Krodhad bhavati sammohah sammohat smriti-vibhramah",
        "e": "From anger, complete delusion arises, and from delusion bewilderment of memory. When memory is bewildered, intelligence is lost.",
        "r": "2.63"
    }
]

def generate_daily_email_content():
    verse = random.choice(VERSES)
    html = f"""
    <html>
    <body style="font-family: 'Lora', serif; background-color: #FDF3DC; color: #2C1A00; padding: 40px; text-align: center;">
        <h2 style="font-family: 'Yeseva One', serif; color: #E8A020;">✦ Daily Divine Guidance ✦</h2>
        <p style="font-size: 1.2rem; font-style: italic;">"{verse['s']}"</p>
        <p style="font-size: 1.1rem;">{verse['e']}</p>
        <p style="color: #1A6B72; font-weight: bold;">— Bhagavad Gita {verse['r']}</p>
        
        <br>
        <a href="https://geetabot.com" style="background-color: #1A6B72; color: #FDF3DC; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Seek Further Wisdom</a>
    </body>
    </html>
    """
    return html

def run_notification_worker():
    print("--- 🕊️ Starting GeetaBot Notification Worker 🕊️ ---")
    print("Fetching active users from Supabase...")
    
    # Note: Using the ANON KEY means we might not be able to fetch all rows if RLS is strict.
    # In a real production SaaS, the worker uses the Service Role Key.
    try:
        # We query the user_usage table because every new user gets a row here
        response = supabase.table("user_usage").select("user_id").execute()
        users = response.data
        
        if not users:
            print("No users found to notify.")
            return

        print(f"Found {len(users)} users. Preparing divine messages...\n")
        
        for u in users:
            uid = u['user_id']
            # Simulate sending email
            print(f"📨 Simulating email dispatch to User ID: {uid}")
            content = generate_daily_email_content()
            # print(content) # Uncomment to see HTML payload
            time.sleep(0.5) # Simulate network delay
            
        print("\n✅ All divine notifications dispatched successfully.")
        
    except Exception as e:
        print(f"Failed to run worker: {e}")

if __name__ == "__main__":
    run_notification_worker()
