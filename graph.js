function initGraph(canvas, sim) {
    let ctx = document.getElementById(canvas).getContext('2d');
    let c = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            tooltips: {
                mode: 'index',
                intersect: false
            },
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Number of particles'
                    },
                    ticks: {
                        beginAtZero: true,
                        suggestedMax: 100,
                    }
                }],
                xAxes: [{
                    type: 'linear',
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Time (ticks)'
                    },
                    ticks: {
                        beginAtZero: true,
                        min: 0,
                        suggestedMax: 10
                    }
                }]
            },
            responsive: false,
            animation: {
                duration: 0
            }
        }
    });

    let species = Array.from(sim.speciesInvolved);
    let colours = ['rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)'];

    for (let i = 0; i < species.length; i++) {
        c.data.datasets[i] = {
            label: species[i].name,
            fill: false,
            borderColor: colours[i],
            backgroundColor: colours[i],
            pointRadius: 2
        };
    }
    c.update();
    animateGraph();

    function animateGraph() {
        let age = sim.age;
        if (age <= 3000) {
            c.options.scales.xAxes[0].ticks.max = age;
            c.update();
            if (age % 50 === 0) {
                let comp = sim.compositionHistory;
                for (let i = 0; i < species.length; i++) {
                    if (!(age === undefined)) {
                        c.data.datasets[i].data.push({x: age, y: comp[species[i].name][age]});
                    }
                }
                c.update();
            }
            requestAnimationFrame(animateGraph);
        }
        if (age === 3000) sim.age++;
        return 0;
    }
}


