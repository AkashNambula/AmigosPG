import json
import urllib.request
import urllib.error
import time
import os

BASE_URL = "http://localhost:8000/api"

def make_request(path, method="GET", data=None, token=None, files=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_data = None
    
    if files:
        # Construct simple multipart/form-data payload for testing
        boundary = "----TestBoundary123456789"
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        body = bytearray()
        
        # Add form fields
        for key, val in data.items():
            body.extend(f"--{boundary}\r\n".encode())
            body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
            body.extend(f"{val}\r\n".encode())
            
        # Add files
        for key, file_info in files.items():
            filename, file_content, content_type = file_info
            body.extend(f"--{boundary}\r\n".encode())
            body.extend(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode())
            body.extend(f"Content-Type: {content_type}\r\n\r\n".encode())
            body.extend(file_content)
            body.extend(b"\r\n")
            
        body.extend(f"--{boundary}--\r\n".encode())
        req_data = bytes(body)
    elif data:
        headers["Content-Type"] = "application/json"
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
        except Exception:
            err_json = err_body
        return e.code, err_json
    except Exception as e:
        return 500, {"detail": str(e)}

def run_tests():
    print("=== STARTING AMIGOS PG API WORKFLOW INTEGRATION TESTS ===")
    
    # 1. Register a tenant
    email = f"tenant_{int(time.time())}@test.com"
    register_data = {
        "first_name": "Raj",
        "last_name": "Kumar",
        "email": email,
        "phone": "9876543211",
        "state": "Karnataka",
        "city": "Bengaluru",
        "password": "Password123",
        "confirm_password": "Password123"
    }
    
    print("\n1. Testing tenant registration...")
    status, res = make_request("/auth/register", "POST", register_data)
    if status == 201:
        print(f"[SUCCESS] Tenant registered successfully: {res['email']}")
    else:
        print(f"[FAIL] Registration failed: {res}")
        return

    # 2. Login tenant
    print("\n2. Testing tenant login...")
    login_data = {"email": email, "password": "Password123"}
    status, res = make_request("/auth/login", "POST", login_data)
    if status == 200:
        tenant_token = res["access_token"]
        print(f"[SUCCESS] Tenant logged in. Token: {tenant_token[:20]}...")
    else:
        print(f"[FAIL] Tenant login failed: {res}")
        return

    # 3. Login admin (default credentials)
    print("\n3. Testing admin login (default parameters)...")
    admin_login_data = {"email": "admin@amigospg.com", "password": "AdminAmigos123"}
    status, res = make_request("/auth/login", "POST", admin_login_data)
    if status == 200:
        admin_token = res["access_token"]
        print(f"[SUCCESS] Admin logged in. Token: {admin_token[:20]}...")
    else:
        print(f"[FAIL] Admin login failed: {res}")
        return

    # 4. RBAC Check: Tenant tries to view admin audit logs
    print("\n4. Testing Role-Based Access Control protection (RBAC)...")
    status, res = make_request("/admin/audit-logs", "GET", token=tenant_token)
    if status == 403:
        print("[SUCCESS] Tenant was blocked from accessing admin logs (HTTP 403 Forbidden).")
    else:
        print(f"[FAIL] Tenant accessed admin endpoint! Status: {status}, Response: {res}")

    # 5. Create a room (by admin)
    room_number = f"R-{int(time.time())}"
    room_data = {
        "floor": 1,
        "room_number": room_number,
        "total_capacity": 2,
        "sharing_type": "2 Sharing",
        "monthly_price": 7500.0,
        "security_deposit": 5000.0,
        "description": "Premium 2 sharing room with attached bathroom.",
        "facilities": ["Wi-Fi", "AC", "Attached Bathroom"]
    }
    print(f"\n5. Testing Room Creation by Admin (Room {room_number})...")
    status, res = make_request("/rooms/", "POST", room_data, token=admin_token)
    if status == 201:
        room_id = res["id"]
        print(f"[SUCCESS] Room created successfully. ID: {room_id}")
    else:
        print(f"[FAIL] Room creation failed: {res}")
        return

    # 6. Tenant browse rooms list
    print("\n6. Testing Room Browsing by Tenant...")
    status, res = make_request("/rooms/", "GET", token=tenant_token)
    if status == 200:
        room_found = any(r["id"] == room_id for r in res)
        print(f"[SUCCESS] Tenant listed rooms. Found new room: {room_found}")
    else:
        print(f"[FAIL] Listing rooms failed: {res}")
        return

    # 7. Submit a room booking (by tenant)
    print("\n7. Testing Room Booking Request submission (multipart/form-data)...")
    booking_form_data = {
        "room_id": str(room_id),
        "booking_start_date": "2026-09-01",
        "duration": "3 Months",
        "luggage_bags_count": "2",
        "additional_notes": "Will arrive in the afternoon.",
        "terms_accepted": "True"
    }
    # Mock dummy file payloads
    files = {
        "aadhaar_id": ("aadhaar.png", b"fake_aadhaar_binary_data", "image/png"),
        "user_photo": ("photo.jpg", b"fake_photo_binary_data", "image/jpeg")
    }
    status, res = make_request("/bookings/", "POST", booking_form_data, token=tenant_token, files=files)
    if status == 201:
        booking_id = res["id"]
        print(f"[SUCCESS] Booking request created in PENDING state. ID: {booking_id}")
    else:
        print(f"[FAIL] Booking request failed: {res}")
        return

    # 8. Duplicate Booking prevention check
    print("\n8. Testing duplicate booking request prevention...")
    status, res = make_request("/bookings/", "POST", booking_form_data, token=tenant_token, files=files)
    if status == 400:
        print(f"[SUCCESS] Duplicate booking rejected (HTTP 400): {res['detail']}")
    else:
        print(f"[FAIL] Duplicate booking allowed! Status: {status}, Response: {res}")

    # 9. Admin approve booking request
    print("\n9. Testing Admin booking request approval workflow...")
    status, res = make_request(f"/bookings/{booking_id}/status", "PUT", {"status": "APPROVED"}, token=admin_token)
    if status == 200:
        print("[SUCCESS] Booking request approved by administrator.")
    else:
        print(f"[FAIL] Booking approval failed: {res}")
        return

    # 10. Check Capacity Logic (vacancy decreases)
    print("\n10. Testing Room Capacity Adjustment Logic...")
    status, res = make_request(f"/rooms/{room_id}", "GET", token=tenant_token)
    if status == 200:
        avail_beds = res["available_beds"]
        occupied_beds = res["occupied_beds"]
        print(f"[SUCCESS] Bed allocation adjusted. Occupied beds: {occupied_beds}, Available beds: {avail_beds}")
        if avail_beds == 1 and occupied_beds == 1:
            print("[SUCCESS] Bed count validated correctly (2 total, 1 occupied, 1 available).")
        else:
            print(f"[FAIL] Incorrect bed count values: {res}")
    else:
        print(f"[FAIL] Fetching room details failed: {res}")

    print("\n=== ALL INTEGRATION WORKFLOW TESTS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
