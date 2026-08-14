import requests

login_url = "http://localhost:8000/api/auth/login"
login_payload = {
    "email": "admin@amigospg.com",
    "password": "AdminAmigos123"
}
login_res = requests.post(login_url, json=login_payload)
token = login_res.json().get("access_token")

if token:
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get("http://localhost:8000/api/rooms/availability", headers=headers)
    print("Status:", res.status_code)
    try:
        print("JSON keys:", res.json().keys())
        print("Stats:", res.json().get("stats"))
        print("First room keys:", res.json().get("rooms")[0].keys())
        print("Total rooms count:", len(res.json().get("rooms")))
    except Exception as e:
        print("Error:", e)
        print("Response text:", res.text)
