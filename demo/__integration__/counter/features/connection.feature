# example

Feature: Connection

  Scenario: Connecting multiple remotes
    Given I visit demo home page
    And I visit master page
    And [master] triggers open event
    Then I open a new remote from master, it should trigger an open event on remote
    And [master/remote] should receive/emit remote.connect event
    Then I open a new remote from master, it should trigger an open event on remote
    And [master/remote] should receive/emit remote.connect event
    Then I open a new remote from master, it should trigger an open event on remote
    And [master/remote] should receive/emit remote.connect event
