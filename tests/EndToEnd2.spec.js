import {test , expect} from '@playwright/test'; 
import { LoginPage } from '../Pages/Login';
import { Inbox } from '../Pages/Inbox';
import { NewJob } from '../Pages/NewJobTab';

//Test Data fill up prior running the test
const jobName = "Compliance Source";
const source = "Compliance"; //Inspection, Tenant, Owner, Supplier, Compliance
const property = "33";
const tenancy = "Arnold Fisherman";
const title = jobName;
const description = jobName;
const assignTo = "Josh Sali";
const year = "2025";
const month = "March";
const dayStart = "12";
const dayEnd = "30";


test('newJobCreate',async ({page}) => {
    //login
    const loginPage = new LoginPage(page);
    await loginPage.gotoLoginPage();
    await loginPage.login();

    //New Job
    const newJob = new NewJob(page);
    await newJob.createJob(source, property, tenancy, title, description, assignTo);
    
    //Inbox
    const inbox = new Inbox (page);
    await inbox.CheckJob(jobName);
    

    });