Feature: Counter

  Background: Connecting multiple remotes
    Given I visit demo home page
    And I visit master page
    And [master] triggers open event
    Then I open a new remote from master, it should trigger an open event on remote
    And [master] should receive remote.connect event
    And [master] remote lists should be "[0]"
    Then I open a new remote from master, it should trigger an open event on remote
    And [master] should receive remote.connect event
    And [master] remote lists should be "[0,0]"
    Then I open a new remote from master, it should trigger an open event on remote
    And [master] should receive remote.connect event
    And [master] remote lists should be "[0,0,0]"

  Scenario: Basic
    Given I close every remotes

  Scenario: Send events
    Given I close every remotes
