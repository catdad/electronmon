workflow "Build" {
  on = "push"
  resolves = ["Lint"]
}

action "Install" {
  uses = "actions/npm@master"
  args = "install"
}

action "Lint" {
  needs = "Install"
  uses = "actions/npm@master"
  args = "lint"
}
