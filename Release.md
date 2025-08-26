# Release process

## 0 step	

	- Run npm test.js - check results

## 1st step
	
	- Add changes to Changelog.md file
	- increase version of package.json file

## 2nd step
	
	commit files

	create and push tag

## 3rd step
	
	launch release on git:
		>> gh release create ${tag}

## 4th step
	
	npm publish