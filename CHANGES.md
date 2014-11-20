# Release notes

## 0.5.2
* Added new promise aliases (thenOne, thenMap, thenEach, ...)
* Added **#union()** query method
* Moved model method/vars to Model.prototype
* Added shortcut for #select() aliases
* Various bug fixes

## 0.5.0
* **HUGE** breaking change: all query functions, chaining, etc. converted completely to *glorious* promises
* Logger now works better(and verbose can be switched per model)
* Docs modualarized

## 0.1.4
* Fix major model#save() bug: updating an entry would 

## 0.1.2
* Ability to add a custom query method: `db.addQueryMethod()`
* Queue object accepts other queues