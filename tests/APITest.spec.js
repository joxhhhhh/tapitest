import {test, expect} from '@playwright/test';
var userid;


test ('Get Request', async ({request}) => { //get request

    const response = await request.get('https://reqres.in/api/users?page=2');
    console.log(await response.json());
    expect(response.status()).toBe(200);    

});


test ('Post Request', async ({request}) => { //create request
    const response  = await request.post('https://reqres.in/api/users', {
            json: {
            name: 'Josh',
            job: 'Unemployed'},
            headers: {"Accept":"application/json"}

    });
    console.log(await response.json());
    expect(response.status()).toBe(201);

    var res= await response.json()
    userid = res.id
    console.log("The Created User ID is: "+userid);

})

test ('Put Request', async ({request}) => { //update request
    const response = await request.put('https://reqres.in/api/users/'+userid, {
        json: {
        name: 'Josh',
        job: 'QA Engineer'},
        headers: {"Accept":"application/json"}
    }); 
    console.log(await response.json());
    expect(response.status()).toBe(200);
    console.log("The updated User ID is: "+userid);

})

test ('Delete Request', async ({request}) => { //delete request
    const response = await request.delete('https://reqres.in/api/users/'+userid);
    expect(response.status()).toBe(204);
    console.log("The deleted User ID is: "+userid);

})
