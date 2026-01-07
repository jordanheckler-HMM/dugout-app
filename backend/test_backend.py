#!/usr/bin/env python3
"""
Quick verification script to test the backend setup.

Run this after starting the backend to verify everything is working.
Usage: python test_backend.py
"""

import sys
import httpx
import json


def check_api_health():
    """Check if the API is running and healthy."""
    print("🔍 Checking API health...")
    try:
        response = httpx.get("http://localhost:8000/health", timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            print("  ✓ API is running")
            print(f"  ✓ Ollama connected: {data.get('ollama_connected')}")
            print(f"  ✓ Lyra model available: {data.get('lyra_model_available')}")
            if data.get('ollama_models'):
                print(f"  ✓ Available models: {', '.join(data.get('ollama_models', []))}")
            return True
        else:
            print(f"  ✗ API returned status code: {response.status_code}")
            return False
    except httpx.ConnectError:
        print("  ✗ Cannot connect to API at http://localhost:8000")
        print("  Make sure the backend is running with: uvicorn main:app --reload")
        return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def test_player_endpoints():
    """Test player CRUD operations."""
    print("\n🧑 Testing player endpoints...")
    
    try:
        # Create a test player
        player_data = {
            "name": "Test Player",
            "number": 99,
            "primary_position": "SS",
            "secondary_positions": ["2B"],
            "bats": "R",
            "throws": "R",
            "notes": "Test player for verification"
        }
        
        response = httpx.post(
            "http://localhost:8000/players",
            json=player_data,
            timeout=5.0
        )
        
        if response.status_code == 201:
            player = response.json()
            player_id = player["id"]
            print(f"  ✓ Created test player (ID: {player_id})")
            
            # Get the player
            response = httpx.get(f"http://localhost:8000/players/{player_id}")
            if response.status_code == 200:
                print("  ✓ Retrieved player")
            
            # Update the player
            response = httpx.put(
                f"http://localhost:8000/players/{player_id}",
                json={"notes": "Updated notes"},
                timeout=5.0
            )
            if response.status_code == 200:
                print("  ✓ Updated player")
            
            # Delete the player
            response = httpx.delete(f"http://localhost:8000/players/{player_id}")
            if response.status_code == 204:
                print("  ✓ Deleted test player")
            
            return True
        else:
            print(f"  ✗ Failed to create player: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def test_lineup_endpoints():
    """Test lineup endpoints."""
    print("\n📋 Testing lineup endpoints...")
    
    try:
        # Get lineup
        response = httpx.get("http://localhost:8000/lineup", timeout=5.0)
        if response.status_code == 200:
            lineup = response.json()
            print(f"  ✓ Retrieved lineup ({len(lineup)} slots)")
            
            # Update lineup
            response = httpx.put(
                "http://localhost:8000/lineup",
                json={"lineup": lineup},
                timeout=5.0
            )
            if response.status_code == 200:
                print("  ✓ Updated lineup")
                return True
        
        return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def test_field_endpoints():
    """Test field position endpoints."""
    print("\n⚾ Testing field position endpoints...")
    
    try:
        # Get field positions
        response = httpx.get("http://localhost:8000/field", timeout=5.0)
        if response.status_code == 200:
            field = response.json()
            print(f"  ✓ Retrieved field positions ({len(field)} positions)")
            
            # Update field
            response = httpx.put(
                "http://localhost:8000/field",
                json={"field_positions": field},
                timeout=5.0
            )
            if response.status_code == 200:
                print("  ✓ Updated field positions")
                return True
        
        return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def test_configuration_endpoints():
    """Test configuration endpoints."""
    print("\n💾 Testing configuration endpoints...")
    
    try:
        # Get configurations
        response = httpx.get("http://localhost:8000/configurations", timeout=5.0)
        if response.status_code == 200:
            configs = response.json()
            print(f"  ✓ Retrieved configurations ({len(configs)} saved)")
            return True
        
        return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("🧢 Dugout Backend Verification")
    print("=" * 60)
    
    results = []
    
    # Run all tests
    results.append(("API Health", check_api_health()))
    results.append(("Player Endpoints", test_player_endpoints()))
    results.append(("Lineup Endpoints", test_lineup_endpoints()))
    results.append(("Field Endpoints", test_field_endpoints()))
    results.append(("Configuration Endpoints", test_configuration_endpoints()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status:8} {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✓ All tests passed! Backend is working correctly.")
        print("\nNext steps:")
        print("  1. Connect your frontend to http://localhost:8000")
        print("  2. Visit http://localhost:8000/docs for API documentation")
        print("  3. Make sure Ollama is running for Lyra features")
        return 0
    else:
        print("\n✗ Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

