# Test verview

## Instructions questions
I figured it was best to push on with my best estimations because of (what I believe to be) the narrow scope of this test.

- The Special Item should be the only item which shows in this category
	- CN: I couldn't tell if there should have been a restriction so that only **Special Item** product would be allowed in **Special Items** category. It made sense to me to add another product to the category for testing the **Add All To Cart** feature.
- Add a button at the top of the category page labeled Add All To Cart.
	- CN: I was not clear on what *top of the category page* meant.
- When clicked, the product will be added to the cart. Notify the user that the product has been added.
	- CN: I struggled to identify the best method to notify the user so I settled on inline alert boxes.

## BigCommerce, Stencil, Handlebars
The process was slow-going because of my ignorance surrounding the workflow. I found myself experiencing issues having to do with XHR, csrf, 404, file cache, etc.

## Task items
I chose to do a large chunk of data passing by utilizing HTML data attributes, for the lack of a better alternative. I would have liked to import a data object (not sure if possible) to process each step within the category class. Adding multiple items to the cart isn't possible via the standard cart endpoint (cart.php?action=add&product_id=112), so why not keep it in JS? I wasn't unable to pursue this further, as well as solving the other kinks that remain within the time that I allotted myself.

Overall, I saw many areas for improvement in the work I did to ensure a seamless user experience.

Also, I apologize for pushing once without commits. I was so focused on the test that it slipped my mind.

Thank you for your time!