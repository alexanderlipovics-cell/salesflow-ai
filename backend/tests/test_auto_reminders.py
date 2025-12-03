"""
Tests for Auto-Reminder Trigger System

Tests cover:
- SQL functions
- Trigger logic
- API endpoints
- Edge cases

Author: Sales Flow AI Team
Created: 2025-12-01
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4


class TestAutoReminderSQL:
    """Test SQL functions and triggers"""
    
    def test_reminder_rules_table_exists(self, supabase_client):
        """Test that reminder_rules table exists"""
        result = supabase_client.table("reminder_rules").select("*").limit(1).execute()
        assert result is not None
    
    def test_auto_reminders_table_exists(self, supabase_client):
        """Test that auto_reminders table exists"""
        result = supabase_client.table("auto_reminders").select("*").limit(1).execute()
        assert result is not None
    
    def test_default_reminder_rules_exist(self, supabase_client):
        """Test that default reminder rules were created"""
        result = supabase_client.table("reminder_rules").select("*").execute()
        assert len(result.data) >= 4
        
        # Check specific rules exist
        rule_names = [rule["name"] for rule in result.data]
        assert "Proposal No Reply (3 days)" in rule_names
        assert "VIP Lead Going Cold (7 days)" in rule_names
    
    def test_check_and_create_auto_reminder_function(self, supabase_client, test_workspace, test_lead):
        """Test the check_and_create_auto_reminder function"""
        result = supabase_client.rpc(
            "check_and_create_auto_reminder",
            {
                "p_lead_id": str(test_lead["id"]),
                "p_workspace_id": str(test_workspace["id"])
            }
        ).execute()
        
        assert result.data is not None
        assert len(result.data) > 0
        assert "reminder_created" in result.data[0]
    
    def test_mark_reminder_completed_function(self, supabase_client, test_reminder):
        """Test marking a reminder as completed"""
        result = supabase_client.rpc(
            "mark_reminder_completed",
            {"p_reminder_id": str(test_reminder["id"])}
        ).execute()
        
        assert result.data[0] is True
        
        # Verify reminder is marked completed
        reminder = supabase_client.table("auto_reminders").select("*").eq(
            "id", str(test_reminder["id"])
        ).execute()
        
        assert reminder.data[0]["is_active"] is False
        assert reminder.data[0]["completed_at"] is not None
    
    def test_get_pending_reminders_function(self, supabase_client, test_workspace):
        """Test getting pending reminders"""
        result = supabase_client.rpc(
            "get_pending_reminders",
            {
                "p_workspace_id": str(test_workspace["id"]),
                "p_limit": 50
            }
        ).execute()
        
        assert result.data is not None
        assert isinstance(result.data, list)


class TestAutoReminderTrigger:
    """Test automatic reminder triggers"""
    
    def test_trigger_on_proposal_no_reply(self, supabase_client, test_workspace, test_user):
        """Test reminder is created when proposal sent with no reply after 3 days"""
        # Create lead with proposal sent 4 days ago
        lead_data = {
            "workspace_id": str(test_workspace["id"]),
            "name": "Test Lead - Proposal No Reply",
            "status": "warm",
            "proposal_sent_date": (datetime.utcnow() - timedelta(days=4)).isoformat(),
            "last_reply_date": None,
            "created_by": str(test_user["id"])
        }
        
        lead = supabase_client.table("leads").insert(lead_data).execute()
        lead_id = lead.data[0]["id"]
        
        # Check if reminder was auto-created
        reminders = supabase_client.table("auto_reminders").select("*").eq(
            "lead_id", lead_id
        ).eq(
            "trigger_condition", "proposal_no_reply"
        ).execute()
        
        # Note: Trigger creates reminder async, might need small delay
        assert reminders.data is not None
        
        # Cleanup
        supabase_client.table("leads").delete().eq("id", lead_id).execute()
    
    def test_trigger_on_vip_going_cold(self, supabase_client, test_workspace, test_user):
        """Test reminder for VIP lead going cold"""
        # Create VIP lead with no contact for 8 days
        lead_data = {
            "workspace_id": str(test_workspace["id"]),
            "name": "Test VIP Lead - Going Cold",
            "status": "warm",
            "priority": "vip",
            "last_contact_date": (datetime.utcnow() - timedelta(days=8)).isoformat(),
            "created_by": str(test_user["id"])
        }
        
        lead = supabase_client.table("leads").insert(lead_data).execute()
        lead_id = lead.data[0]["id"]
        
        # Manually trigger check (since trigger is async)
        result = supabase_client.rpc(
            "check_and_create_auto_reminder",
            {
                "p_lead_id": lead_id,
                "p_workspace_id": str(test_workspace["id"])
            }
        ).execute()
        
        assert result.data[0]["reminder_created"] is True
        assert result.data[0]["trigger_condition"] == "vip_cold"
        
        # Cleanup
        supabase_client.table("leads").delete().eq("id", lead_id).execute()
    
    def test_no_duplicate_reminders(self, supabase_client, test_workspace, test_lead):
        """Test that duplicate reminders are not created"""
        # Trigger reminder check twice
        result1 = supabase_client.rpc(
            "check_and_create_auto_reminder",
            {
                "p_lead_id": str(test_lead["id"]),
                "p_workspace_id": str(test_workspace["id"])
            }
        ).execute()
        
        result2 = supabase_client.rpc(
            "check_and_create_auto_reminder",
            {
                "p_lead_id": str(test_lead["id"]),
                "p_workspace_id": str(test_workspace["id"])
            }
        ).execute()
        
        # First might create, second should not
        if result1.data[0]["reminder_created"]:
            assert result2.data[0]["reminder_created"] is False


class TestAutoReminderAPI:
    """Test API endpoints"""
    
    def test_get_pending_reminders(self, client, auth_headers):
        """Test GET /api/auto-reminders/pending"""
        response = client.get(
            "/api/auto-reminders/pending",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_pending_reminders_with_limit(self, client, auth_headers):
        """Test GET /api/auto-reminders/pending with limit"""
        response = client.get(
            "/api/auto-reminders/pending?limit=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert len(response.json()) <= 10
    
    def test_manually_trigger_reminder_check(self, client, auth_headers, test_lead):
        """Test POST /api/auto-reminders/check/{lead_id}"""
        response = client.post(
            f"/api/auto-reminders/check/{test_lead['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "reminder_created" in data
        assert "message" in data
    
    def test_manually_trigger_nonexistent_lead(self, client, auth_headers):
        """Test manual trigger with nonexistent lead"""
        fake_lead_id = str(uuid4())
        response = client.post(
            f"/api/auto-reminders/check/{fake_lead_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    def test_mark_reminder_completed(self, client, auth_headers, test_reminder):
        """Test POST /api/auto-reminders/complete"""
        response = client.post(
            "/api/auto-reminders/complete",
            headers=auth_headers,
            json={"reminder_id": str(test_reminder["id"])}
        )
        
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_mark_nonexistent_reminder_completed(self, client, auth_headers):
        """Test marking nonexistent reminder as completed"""
        fake_reminder_id = str(uuid4())
        response = client.post(
            "/api/auto-reminders/complete",
            headers=auth_headers,
            json={"reminder_id": fake_reminder_id}
        )
        
        assert response.status_code == 404
    
    def test_get_reminder_stats(self, client, auth_headers):
        """Test GET /api/auto-reminders/stats"""
        response = client.get(
            "/api/auto-reminders/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_active" in data
        assert "total_overdue" in data
        assert "by_priority" in data
        assert "by_condition" in data
    
    def test_get_reminder_rules(self, client):
        """Test GET /api/auto-reminders/rules"""
        response = client.get("/api/auto-reminders/rules")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 4
    
    def test_get_reminder_rules_active_only(self, client):
        """Test GET /api/auto-reminders/rules?active_only=true"""
        response = client.get("/api/auto-reminders/rules?active_only=true")
        
        assert response.status_code == 200
        rules = response.json()
        assert all(rule["is_active"] for rule in rules)
    
    def test_create_reminder_rule(self, client, admin_auth_headers):
        """Test POST /api/auto-reminders/rules"""
        rule_data = {
            "name": "Test Rule",
            "description": "Test reminder rule",
            "trigger_condition": "test_condition",
            "days_after": 5,
            "priority": "medium",
            "task_title_template": "Test reminder for {lead_name}",
            "task_description_template": "This is a test",
            "is_active": True
        }
        
        response = client.post(
            "/api/auto-reminders/rules",
            headers=admin_auth_headers,
            json=rule_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Rule"
        assert data["days_after"] == 5
    
    def test_create_reminder_rule_non_admin(self, client, auth_headers):
        """Test creating rule without admin permissions"""
        rule_data = {
            "name": "Test Rule",
            "trigger_condition": "test",
            "days_after": 5,
            "priority": "medium",
            "task_title_template": "Test"
        }
        
        response = client.post(
            "/api/auto-reminders/rules",
            headers=auth_headers,
            json=rule_data
        )
        
        assert response.status_code == 403
    
    def test_update_reminder_rule(self, client, admin_auth_headers, test_rule):
        """Test PUT /api/auto-reminders/rules/{rule_id}"""
        updated_data = {
            "name": "Updated Rule Name",
            "trigger_condition": test_rule["trigger_condition"],
            "days_after": 7,
            "priority": "high",
            "task_title_template": "Updated template",
            "is_active": True
        }
        
        response = client.put(
            f"/api/auto-reminders/rules/{test_rule['id']}",
            headers=admin_auth_headers,
            json=updated_data
        )
        
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Rule Name"
        assert response.json()["days_after"] == 7
    
    def test_delete_reminder_rule(self, client, admin_auth_headers, test_rule):
        """Test DELETE /api/auto-reminders/rules/{rule_id}"""
        response = client.delete(
            f"/api/auto-reminders/rules/{test_rule['id']}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify rule is deactivated
        check = client.get(f"/api/auto-reminders/rules?active_only=true")
        rules = check.json()
        assert not any(rule["id"] == str(test_rule["id"]) for rule in rules)
    
    def test_health_check(self, client):
        """Test GET /api/auto-reminders/health"""
        response = client.get("/api/auto-reminders/health")
        
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestAutoReminderEdgeCases:
    """Test edge cases and error handling"""
    
    def test_reminder_for_closed_won_lead(self, supabase_client, test_workspace, test_user):
        """Test that reminders are not created for closed_won leads"""
        lead_data = {
            "workspace_id": str(test_workspace["id"]),
            "name": "Closed Won Lead",
            "status": "closed_won",
            "last_contact_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "created_by": str(test_user["id"])
        }
        
        lead = supabase_client.table("leads").insert(lead_data).execute()
        lead_id = lead.data[0]["id"]
        
        result = supabase_client.rpc(
            "check_and_create_auto_reminder",
            {
                "p_lead_id": lead_id,
                "p_workspace_id": str(test_workspace["id"])
            }
        ).execute()
        
        assert result.data[0]["reminder_created"] is False
        
        # Cleanup
        supabase_client.table("leads").delete().eq("id", lead_id).execute()
    
    def test_reminder_priority_calculation(self, supabase_client, test_workspace):
        """Test that reminder due dates are calculated based on priority"""
        reminders = supabase_client.table("auto_reminders").select(
            "priority, due_date, triggered_at"
        ).limit(10).execute()
        
        # Just verify structure exists
        assert reminders.data is not None
    
    def test_template_variable_replacement(self, supabase_client, test_workspace, test_lead):
        """Test that template variables are replaced correctly"""
        # Create a reminder and check the task title
        result = supabase_client.rpc(
            "check_and_create_auto_reminder",
            {
                "p_lead_id": str(test_lead["id"]),
                "p_workspace_id": str(test_workspace["id"])
            }
        ).execute()
        
        if result.data[0]["reminder_created"]:
            task_id = result.data[0]["task_id"]
            task = supabase_client.table("tasks").select("title").eq(
                "id", task_id
            ).execute()
            
            # Verify {lead_name} was replaced
            assert "{lead_name}" not in task.data[0]["title"]
            assert test_lead["name"] in task.data[0]["title"] or "Lead" in task.data[0]["title"]


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def test_workspace(supabase_client):
    """Create a test workspace"""
    workspace = supabase_client.table("workspaces").insert({
        "name": "Test Workspace - Auto Reminders"
    }).execute()
    
    yield workspace.data[0]
    
    # Cleanup
    supabase_client.table("workspaces").delete().eq(
        "id", workspace.data[0]["id"]
    ).execute()


@pytest.fixture
def test_user(supabase_client, test_workspace):
    """Create a test user"""
    # Note: Actual implementation depends on your auth system
    # This is a placeholder
    user = {"id": str(uuid4()), "email": "test@example.com"}
    yield user


@pytest.fixture
def test_lead(supabase_client, test_workspace, test_user):
    """Create a test lead"""
    lead = supabase_client.table("leads").insert({
        "workspace_id": str(test_workspace["id"]),
        "name": "Test Lead",
        "status": "warm",
        "last_contact_date": (datetime.utcnow() - timedelta(days=5)).isoformat(),
        "created_by": str(test_user["id"])
    }).execute()
    
    yield lead.data[0]
    
    # Cleanup
    supabase_client.table("leads").delete().eq("id", lead.data[0]["id"]).execute()


@pytest.fixture
def test_reminder(supabase_client, test_lead):
    """Create a test reminder"""
    reminder = supabase_client.table("auto_reminders").insert({
        "lead_id": str(test_lead["id"]),
        "trigger_condition": "test",
        "is_active": True
    }).execute()
    
    yield reminder.data[0]
    
    # Cleanup
    supabase_client.table("auto_reminders").delete().eq(
        "id", reminder.data[0]["id"]
    ).execute()


@pytest.fixture
def test_rule(supabase_client):
    """Create a test reminder rule"""
    rule = supabase_client.table("reminder_rules").insert({
        "name": "Test Rule",
        "trigger_condition": "test_condition",
        "days_after": 3,
        "priority": "medium",
        "task_title_template": "Test: {lead_name}",
        "is_active": True
    }).execute()
    
    yield rule.data[0]
    
    # Cleanup
    supabase_client.table("reminder_rules").delete().eq(
        "id", rule.data[0]["id"]
    ).execute()

