import requests

login_url = "http://localhost:8000/api/auth/login"
login_payload = {
    "email": "admin@amigospg.com",
    "password": "AdminAmigos123"
}
login_res = requests.post(login_url, json=login_payload)
print("Login status:", login_res.status_code)

try:
    login_data = login_res.json()
    token = login_data.get("access_token")
    print(f"Login token obtained: {token[:10]}...")
except Exception as e:
    print(f"Login failed to retrieve token: {e}")
    token = None

if token:
    headers = {
        "Authorization": f"Bearer {token}"
    }
    settings_url = "http://localhost:8000/api/bills/settings"
    data = {
        "upi_id": "9876543210@ybl"
    }
    res = requests.put(settings_url, data=data, headers=headers)
    print("PUT /api/bills/settings status:", res.status_code)
    print("Response JSON:", res.json())
