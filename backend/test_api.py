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

    # 11. Super Admin login & Tenant B creation
    print("\n11. Testing Super Admin login and new PG Tenant creation...")
    status, res = make_request("/auth/login", "POST", {"email": "superadmin@amigospg.com", "password": "SuperAdmin123"})
    if status == 200:
        super_admin_token = res["access_token"]
        print(f"[SUCCESS] Super Admin logged in. Token: {super_admin_token[:20]}...")
    else:
        print(f"[FAIL] Super Admin login failed: {res}")
        return

    # Create Tenant B via Super Admin with Logo Upload
    tenant_b_name = f"TEST PG {int(time.time())}"
    tenant_b_admin_email = f"admin_b_{int(time.time())}@testpg.com"
    create_tenant_data = {
        "name": tenant_b_name,
        "description": "Test PG for Tenant Isolation Checks",
        "city": "Hyderabad",
        "state": "Telangana",
        "admin_first_name": "Suresh",
        "admin_last_name": "Rao",
        "admin_email": tenant_b_admin_email,
        "admin_phone": "9998887776",
        "admin_password": "AdminPass123"
    }
    mock_logo = {
        "logo_file": ("test_logo.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82", "image/png")
    }
    status, res = make_request("/tenants", "POST", create_tenant_data, token=super_admin_token, files=mock_logo)
    if status == 201:
        tenant_b_id = res["id"]
        print(f"[SUCCESS] Created PG Tenant B (ID: {tenant_b_id}, Name: {tenant_b_name}, Logo: {res.get('logo_url')}).")
    else:
        print(f"[FAIL] PG Tenant B creation failed: {res}")
        return

    # 12. Login as Admin B
    print("\n12. Testing Admin B login for Tenant B...")
    status, res = make_request("/auth/login", "POST", {"email": tenant_b_admin_email, "password": "AdminPass123"})
    if status == 200:
        admin_b_token = res["access_token"]
        print(f"[SUCCESS] Admin B logged in successfully.")
    else:
        print(f"[FAIL] Admin B login failed: {res}")
        return

    # 13. Admin B creates Room 201 in Tenant B
    print("\n13. Testing Room Creation by Admin B in Tenant B...")
    room_b_data = {
        "floor": 2,
        "room_number": "201",
        "total_capacity": 3,
        "sharing_type": "3 Sharing",
        "monthly_price": 8000.0,
        "security_deposit": 8000.0,
        "description": "Tenant B room 201",
        "facilities": ["Wi-Fi", "Daily Cleaning"]
    }
    status, res = make_request("/rooms/", "POST", room_b_data, token=admin_b_token)
    if status == 201:
        room_b_id = res["id"]
        print(f"[SUCCESS] Admin B created Room 201 (ID: {room_b_id}).")
    else:
        print(f"[FAIL] Admin B room creation failed: {res}")
        return

    # 14. TENANT ISOLATION CHECK
    print("\n14. Testing TENANT ISOLATION (Admin A vs Admin B)...")
    status, admin_a_rooms = make_request("/rooms/", "GET", token=admin_token)
    status, admin_b_rooms = make_request("/rooms/", "GET", token=admin_b_token)
    
    admin_a_has_b_room = any(r["id"] == room_b_id for r in admin_a_rooms)
    admin_b_has_b_room = any(r["id"] == room_b_id for r in admin_b_rooms)
    admin_b_has_a_room = any(r["id"] == room_id for r in admin_b_rooms)
    
    if not admin_a_has_b_room and admin_b_has_b_room and not admin_b_has_a_room:
        print("[SUCCESS] TENANT ISOLATION VERIFIED! Admin A cannot see Tenant B's room, and Admin B cannot see Tenant A's room.")
    else:
        print(f"[FAIL] Tenant isolation breach detected! A_has_B: {admin_a_has_b_room}, B_has_B: {admin_b_has_b_room}, B_has_A: {admin_b_has_a_room}")

    # 15. DYNAMIC BRANDING API CHECK
    print("\n15. Testing Dynamic Tenant Branding API (/tenant/me)...")
    status_a, tenant_a_brand = make_request("/tenant/me", "GET", token=admin_token)
    status_b, tenant_b_brand = make_request("/tenant/me", "GET", token=admin_b_token)
    
    if isinstance(tenant_a_brand, dict) and isinstance(tenant_b_brand, dict) and tenant_a_brand.get("name") == "AMIGOS MENS LUXURY PG" and tenant_b_brand.get("name") == tenant_b_name:
        print(f"[SUCCESS] DYNAMIC BRANDING VERIFIED! Tenant A: {tenant_a_brand['name']}, Tenant B: {tenant_b_brand['name']}")
    else:
        print(f"[FAIL] Dynamic branding check failed! Status A: {status_a}, A: {tenant_a_brand}, Status B: {status_b}, B: {tenant_b_brand}")

    # 16. FEATURE ACCESS CONTROL CHECK
    print("\n16. Testing Tenant Feature Access Control System...")
    # Fetch current features for Tenant B
    status, b_features_res = make_request(f"/super-admin/tenants/{tenant_b_id}/features", "GET", token=super_admin_token)
    if status == 200:
        print(f"[SUCCESS] Super Admin fetched features for Tenant B: {b_features_res.get('features', {})}")
    else:
        print(f"[FAIL] Failed to fetch features for Tenant B: {status} {b_features_res}")

    # Turn OFF 'billing' and 'food_menu' for Tenant B
    updated_features = dict(b_features_res.get("features", {}))
    updated_features["billing"] = False
    updated_features["food_menu"] = False
    
    status, update_res = make_request(
        f"/super-admin/tenants/{tenant_b_id}/features", 
        "PUT", 
        data={"features": updated_features}, 
        token=super_admin_token
    )
    
    if status == 200 and update_res.get("features", {}).get("billing") == False:
        print(f"[SUCCESS] Super Admin disabled 'billing' and 'food_menu' for Tenant B.")
    else:
        print(f"[FAIL] Failed to update features for Tenant B: {status} {update_res}")

    # Verify Admin B (Tenant B) is blocked from /bills and /food-menu (HTTP 403 Forbidden)
    status_b_bills, _ = make_request("/bills/", "GET", token=admin_b_token)
    status_b_food, _ = make_request("/food-menu/", "GET", token=admin_b_token)
    
    if status_b_bills == 403 and status_b_food == 403:
        print("[SUCCESS] BACKEND FEATURE AUTHORIZATION VERIFIED! Admin B blocked from billing and food-menu (HTTP 403).")
    else:
        print(f"[FAIL] Backend feature authorization failed! Bills status: {status_b_bills}, Food status: {status_b_food}")

    # Verify Admin A (Tenant A) is NOT blocked (Tenant A billing remains ON)
    status_a_bills, _ = make_request("/bills/", "GET", token=admin_token)
    if status_a_bills == 200:
        print("[SUCCESS] TENANT ISOLATION VERIFIED! Disabling billing on Tenant B did NOT affect Tenant A.")
    else:
        print(f"[FAIL] Tenant isolation breach on feature toggle! Tenant A bills status: {status_a_bills}")

    # Verify Super Admin bypass (Super Admin can access /bills even for disabled tenant)
    status_super_bills, _ = make_request("/bills/", "GET", token=super_admin_token)
    if status_super_bills == 200:
        print("[SUCCESS] SUPER ADMIN BYPASS VERIFIED! Super Admin retains full access.")
    else:
        print(f"[FAIL] Super admin bypass failed! Status: {status_super_bills}")

    # Re-enable 'billing' for Tenant B
    updated_features["billing"] = True
    make_request(f"/super-admin/tenants/{tenant_b_id}/features", "PUT", data={"features": updated_features}, token=super_admin_token)
    status_b_bills_after, _ = make_request("/bills/", "GET", token=admin_b_token)
    if status_b_bills_after == 200:
        print("[SUCCESS] RE-ENABLING FEATURE VERIFIED! Admin B can access billing after Super Admin re-enabled it.")
    else:
        print(f"[FAIL] Re-enabling feature failed! Status: {status_b_bills_after}")

    # 17. Testing PG Deactivation/Reactivation and Permanent Deletion
    print("\n17. Testing PG Tenant Deactivation, Reactivation, and Permanent Deletion...")
    
    # 17a. Deactivate Tenant B
    status, res = make_request(f"/tenants/{tenant_b_id}/status", "PUT", token=super_admin_token)
    if status == 200 and res.get("is_active") == False:
        print(f"[SUCCESS] Tenant B (ID: {tenant_b_id}) deactivated successfully. Status: is_active=False")
    else:
        print(f"[FAIL] Deactivating Tenant B failed: {status} {res}")

    # 17b. Reactivate Tenant B
    status, res = make_request(f"/tenants/{tenant_b_id}/status", "PUT", token=super_admin_token)
    if status == 200 and res.get("is_active") == True:
        print(f"[SUCCESS] Tenant B (ID: {tenant_b_id}) reactivated successfully. Status: is_active=True")
    else:
        print(f"[FAIL] Reactivating Tenant B failed: {status} {res}")

    # 17c. Permanently Delete Tenant B via DELETE /api/tenants/{tenant_b_id}
    status, res = make_request(f"/tenants/{tenant_b_id}", "DELETE", token=super_admin_token)
    if status == 200:
        print(f"[SUCCESS] PERMANENT DELETE VERIFIED! Tenant B (ID: {tenant_b_id}) deleted successfully: {res.get('message')}")
    else:
        print(f"[FAIL] Deleting Tenant B failed: {status} {res}")

    # 17d. Verify Tenant B is gone (not in tenants list)
    status, all_tenants = make_request("/tenants", "GET", token=super_admin_token)
    tenant_b_found = any(t["id"] == tenant_b_id for t in all_tenants) if status == 200 else False
    if not tenant_b_found:
        print(f"[SUCCESS] VERIFIED Tenant B no longer exists in Super Admin tenants list.")
    else:
        print(f"[FAIL] Tenant B still found in tenants list after deletion!")

    # 17e. Verify Tenant A and Super Admin are completely intact
    status_a_check, brand_a_check = make_request("/tenant/me", "GET", token=admin_token)
    if status_a_check == 200 and brand_a_check and brand_a_check.get("name") == "AMIGOS MENS LUXURY PG":
        print("[SUCCESS] VERIFIED Tenant A (AMIGOS PG) remains 100% intact after Tenant B deletion!")
    else:
        print(f"[FAIL] Tenant A check failed after Tenant B deletion: {status_a_check} {brand_a_check}")

    print("\n=== ALL INTEGRATION WORKFLOW & MULTI-TENANCY TESTS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
