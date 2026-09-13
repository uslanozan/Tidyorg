mock_provider "github" {}

# The root module imports the existing organization settings. Mock providers do
# not execute imports, so override that specific resource for this plan-only test.
override_resource {
  target = github_organization_settings.this
}

override_resource {
  target          = github_team.dashboard_writers[0]
  override_during = plan
  values = {
    slug = "tidyorg-dashboard-writers"
  }
}

variables {
  github_org_name            = "example-org"
  github_app_id              = "123456"
  github_app_installation_id = "12345678"
  github_app_pem_file        = "test-key"
  config_path                = "tests/fixtures/dashboard-access"
}

run "project_mentors_can_propose_config_changes" {
  command = plan

  assert {
    condition     = github_team.dashboard_writers[0].name == "tidyorg-dashboard-writers"
    error_message = "The dashboard writers team must be created when config_repository is set."
  }

  assert {
    condition = toset(keys(github_team_membership.dashboard_writers)) == toset([
      "admin-user",
      "mentor-a",
      "mentor-b",
    ])
    error_message = "Every project mentor must be a dashboard writer."
  }

  assert {
    condition = (
      length(module.repositories["tidyorg-config"].additional_team_access) == 1 &&
      lookup(
        module.repositories["tidyorg-config"].additional_team_access,
        github_team.dashboard_writers[0].slug,
        "",
      ) == "push"
    )
    error_message = "The dashboard writers team must have push on the config repository."
  }

  assert {
    condition     = length(module.repositories["service-a"].additional_team_access) == 0
    error_message = "Dashboard writers must not receive control-plane access to project repositories."
  }
}
