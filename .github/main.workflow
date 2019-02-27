workflow "Build" {
  on = "push"
  resolves = ["lint"]
}

action "lint" {
  uses = "node:10.15"
  runs = ["npm", "run", "cilint"]
}
