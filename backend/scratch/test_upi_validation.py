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
    settings_url = "http://localhost:8000/api/bills/settings"

    # Test cases: (upi_id_input, expected_status, expected_detail)
    cases = [
        ("amigospg@upi", 200, None),
        ("9876543210@paytm", 200, None),
        ("owner@oksbi", 200, None),
        ("invalidupi", 400, "Please enter a valid UPI ID."),
        ("@upi", 400, "Please enter a valid UPI ID."),
        ("name@", 400, "Please enter a valid UPI ID."),
        ("name with spaces@ybl", 400, "Please enter a valid UPI ID."),
        ("name@ybl@ibh", 400, "Please enter a valid UPI ID."),
    ]

    for upi, exp_status, exp_detail in cases:
        res = requests.put(settings_url, data={"upi_id": upi}, headers=headers)
        status = res.status_code
        detail = res.json().get("detail") if status == 400 else None
        
        passed = (status == exp_status) and (detail == exp_detail or exp_status == 200)
        print(f"UPI: '{upi}' -> Status: {status}, Detail: {detail} | PASSED: {passed}")
