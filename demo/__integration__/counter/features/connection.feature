# example

Feature: Connection

  Scenario: Connecting multiple remotes
    Given I visit demo home page
    And I visit master page
    Then [master] triggers "open" event
